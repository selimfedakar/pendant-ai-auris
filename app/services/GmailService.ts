import * as SecureStore from 'expo-secure-store';

// SecureStore keys must not contain special characters like ':' or '@'
const TOKEN_KEY = 'auris_gmail_token';
const TOKEN_EXPIRY_KEY = 'auris_gmail_token_expiry';
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

type EmailSummary = {
  from: string;
  subject: string;
  snippet: string;
};

class GmailService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  async loadToken(): Promise<void> {
    const [token, expiry] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(TOKEN_EXPIRY_KEY),
    ]);
    if (token && expiry && Date.now() < parseInt(expiry, 10)) {
      this.accessToken = token;
      this.tokenExpiry = parseInt(expiry, 10);
    }
  }

  async saveToken(token: string, expiresIn: number): Promise<void> {
    this.accessToken = token;
    this.tokenExpiry = Date.now() + expiresIn * 1000;
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, String(this.tokenExpiry)),
    ]);
  }

  async clearToken(): Promise<void> {
    this.accessToken = null;
    this.tokenExpiry = 0;
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY),
    ]);
  }

  isAuthenticated(): boolean {
    return !!this.accessToken && Date.now() < this.tokenExpiry;
  }

  async getEmailContext(maxEmails = 10): Promise<string> {
    if (!this.accessToken) throw new Error('Not authenticated');

    const listRes = await fetch(
      `${GMAIL_API}/messages?maxResults=${maxEmails}&q=in:inbox`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } },
    );

    if (listRes.status === 401) {
      await this.clearToken();
      throw new Error('GMAIL_TOKEN_EXPIRED');
    }
    if (!listRes.ok) throw new Error(`Gmail list error: ${listRes.status}`);

    const listData = (await listRes.json()) as { messages?: { id: string }[] };
    if (!listData.messages?.length) return 'No recent emails found in inbox.';

    const emails: EmailSummary[] = [];
    for (const msg of listData.messages.slice(0, maxEmails)) {
      try {
        const msgRes = await fetch(
          `${GMAIL_API}/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${this.accessToken}` } },
        );
        if (!msgRes.ok) continue;
        const msgData = (await msgRes.json()) as {
          snippet?: string;
          payload?: { headers?: { name: string; value: string }[] };
        };
        const headers = msgData.payload?.headers ?? [];
        emails.push({
          from: headers.find((h) => h.name === 'From')?.value ?? 'Unknown',
          subject: headers.find((h) => h.name === 'Subject')?.value ?? '(no subject)',
          snippet: (msgData.snippet ?? '').slice(0, 120),
        });
      } catch {
        // skip individual message failures
      }
    }

    if (!emails.length) return 'Could not retrieve email details.';

    const lines = emails.map(
      (e, i) => `${i + 1}. From: ${e.from}\n   Subject: ${e.subject}\n   Preview: ${e.snippet}`,
    );
    return `Recent Gmail inbox (${emails.length} emails):\n${lines.join('\n\n')}`;
  }
}

export const gmailService = new GmailService();
