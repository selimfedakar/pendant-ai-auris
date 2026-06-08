/*
 * Auris Pendant — XIAO ESP32S3 Sense Firmware
 *
 * MCU   : Seeed XIAO ESP32S3 Sense (built-in PDM mic on GPIO42/41)
 * BLE   : NimBLE-Arduino peripheral / GATT server
 *
 * Audio pipeline
 *   PDM mic → IDF I2S-PDM driver → 16 kHz 16-bit mono PCM
 *   Each BLE NOTIFY: 2-byte big-endian seq_num + 240 bytes audio (242 total)
 *   iOS accumulates NOTIFY payloads until 3 200 bytes (100 ms), then sends to backend
 *
 * BLE GATT (UUIDs from PROTOCOL.md)
 *   Service     12345678-1234-1234-1234-123456789abc
 *   Audio char  12345678-1234-1234-1234-123456789abd  NOTIFY
 *   Control     12345678-1234-1234-1234-123456789abe  WRITE_NR
 *
 * Control commands
 *   0x01  START_STREAM
 *   0x02  STOP_STREAM
 *   0x03  STATUS_PING  (Serial only — no BLE reply yet)
 */

#include <Arduino.h>
#include <NimBLEDevice.h>
#include <driver/i2s_pdm.h>
#include <esp_sleep.h>

// Replace per unit before flashing — sent as X-User-Id on the WiFi path
static const char* DEVICE_UUID = "auris-pendant-0001";

// Built-in PDM mic on XIAO ESP32S3 Sense
static constexpr gpio_num_t PDM_CLK_PIN  = GPIO_NUM_42;
static constexpr gpio_num_t PDM_DATA_PIN = GPIO_NUM_41;

// BOOT button (GPIO0, active-low, internal pull-up)
static constexpr gpio_num_t BTN_BOOT_PIN = GPIO_NUM_0;

// BLE notification layout: [seq_hi][seq_lo][240 bytes PCM]
static constexpr size_t AUDIO_PER_NOTIFY = 240;
static constexpr size_t SEQ_BYTES        = 2;
static constexpr size_t NOTIFY_BYTES     = SEQ_BYTES + AUDIO_PER_NOTIFY;  // 242

static const char* SVC_UUID   = "12345678-1234-1234-1234-123456789abc";
static const char* AUDIO_UUID = "12345678-1234-1234-1234-123456789abd";
static const char* CTRL_UUID  = "12345678-1234-1234-1234-123456789abe";

static i2s_chan_handle_t      rx_handle  = nullptr;
static NimBLEServer*          pServer    = nullptr;
static NimBLECharacteristic*  pAudioChar = nullptr;
static NimBLECharacteristic*  pCtrlChar  = nullptr;

static volatile bool gConnected = false;
static volatile bool gStreaming  = false;
static uint16_t      gSeqNum    = 0;

static unsigned long               gLastConnMs  = 0;
static constexpr unsigned long     IDLE_SLEEP_MS = 30000UL;

static DRAM_ATTR int16_t gAudioBuf[AUDIO_PER_NOTIFY / sizeof(int16_t)];
static uint8_t           gPacket[NOTIFY_BYTES];

static void mic_init() {
    i2s_chan_config_t chan_cfg = I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_0, I2S_ROLE_MASTER);
    ESP_ERROR_CHECK(i2s_new_channel(&chan_cfg, NULL, &rx_handle));

    i2s_pdm_rx_config_t pdm_cfg = {
        .clk_cfg  = I2S_PDM_RX_CLK_DEFAULT_CONFIG(16000),
        .slot_cfg = I2S_PDM_RX_SLOT_DEFAULT_CONFIG(
                        I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO),
        .gpio_cfg = {
            .clk          = PDM_CLK_PIN,
            .din          = PDM_DATA_PIN,
            .invert_flags = { .clk_inv = false },
        },
    };
    ESP_ERROR_CHECK(i2s_channel_init_pdm_rx_mode(rx_handle, &pdm_cfg));
    ESP_ERROR_CHECK(i2s_channel_enable(rx_handle));
    Serial.println("[MIC] PDM ready  CLK=GPIO42  DATA=GPIO41");
}

class ServerCB : public NimBLEServerCallbacks {
    void onConnect(NimBLEServer*, NimBLEConnInfo& info) override {
        gConnected  = true;
        gLastConnMs = millis();
        Serial.printf("[BLE] connected  %s\n", info.getAddress().toString().c_str());
        NimBLEDevice::startAdvertising();
    }
    void onDisconnect(NimBLEServer*, NimBLEConnInfo& info, int reason) override {
        gConnected  = false;
        gStreaming   = false;
        gLastConnMs = millis();
        Serial.printf("[BLE] disconnected  reason=%d\n", reason);
        NimBLEDevice::startAdvertising();
    }
};

class CtrlCB : public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic* pChar, NimBLEConnInfo&) override {
        if (pChar->getDataLength() < 1) return;
        const uint8_t cmd = pChar->getValue().data()[0];
        switch (cmd) {
            case 0x01:
                gSeqNum   = 0;
                gStreaming = true;
                Serial.println("[CTRL] START_STREAM");
                break;
            case 0x02:
                gStreaming = false;
                Serial.println("[CTRL] STOP_STREAM");
                break;
            case 0x03:
                Serial.printf("[CTRL] STATUS_PING  uptime=%lus  battery=100%%\n",
                              millis() / 1000UL);
                break;
            default:
                Serial.printf("[CTRL] unknown cmd 0x%02X\n", cmd);
        }
    }
};

static void ble_init() {
    NimBLEDevice::init("AurisPendant");
    NimBLEDevice::setMTU(512);

    pServer = NimBLEDevice::createServer();
    pServer->setCallbacks(new ServerCB());

    NimBLEService* pSvc = pServer->createService(SVC_UUID);

    pAudioChar = pSvc->createCharacteristic(AUDIO_UUID, NIMBLE_PROPERTY::NOTIFY);
    pCtrlChar  = pSvc->createCharacteristic(CTRL_UUID,  NIMBLE_PROPERTY::WRITE_NR);
    pCtrlChar->setCallbacks(new CtrlCB());

    pSvc->start();

    NimBLEAdvertising* pAdv = NimBLEDevice::getAdvertising();
    pAdv->addServiceUUID(SVC_UUID);
    pAdv->setScanResponse(true);
    pAdv->start();

    Serial.printf("[BLE] advertising as 'AurisPendant'  id=%s\n", DEVICE_UUID);
}

static void enter_deep_sleep() {
    Serial.println("[PWR] deep sleep — press BOOT to wake");
    Serial.flush();
    i2s_channel_disable(rx_handle);
    i2s_del_channel(rx_handle);
    NimBLEDevice::deinit(true);
    esp_sleep_enable_ext0_wakeup(BTN_BOOT_PIN, 0);
    esp_deep_sleep_start();
}

static void stream_chunk() {
    if (!gConnected || !gStreaming) return;
    if (pAudioChar->getSubscribedCount() == 0) return;

    size_t bytes_read = 0;
    const esp_err_t err = i2s_channel_read(
        rx_handle, gAudioBuf, AUDIO_PER_NOTIFY,
        &bytes_read, pdMS_TO_TICKS(200));
    if (err != ESP_OK || bytes_read < AUDIO_PER_NOTIFY) return;

    gPacket[0] = (gSeqNum >> 8) & 0xFF;
    gPacket[1] =  gSeqNum       & 0xFF;
    memcpy(gPacket + SEQ_BYTES, gAudioBuf, AUDIO_PER_NOTIFY);
    ++gSeqNum;

    pAudioChar->setValue(gPacket, NOTIFY_BYTES);
    pAudioChar->notify();
}

void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("\n[AURIS] boot");
    Serial.printf("[AURIS] device: %s\n", DEVICE_UUID);
    pinMode(BTN_BOOT_PIN, INPUT_PULLUP);
    mic_init();
    ble_init();
    gLastConnMs = millis();
    Serial.println("[AURIS] ready");
}

void loop() {
    if (gConnected) {
        gLastConnMs = millis();
        gStreaming ? stream_chunk() : delay(10);
    } else {
        if (millis() - gLastConnMs >= IDLE_SLEEP_MS) enter_deep_sleep();
        delay(100);
    }
}
