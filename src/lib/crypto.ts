import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

// In production, ENCRYPTION_KEY must be stored in environment variables.
// It must be a 32-byte (64 character hex) string.
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY environment variable is not set.');
    }
    // Fallback for development if not provided
    console.warn('WARNING: Using default development ENCRYPTION_KEY. Do not use in production!');
    return '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  }
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters) long.');
  }
  return key;
}

export function encrypt(text: string) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted
  };
}

export function decrypt(encryptedData: string, iv: string) {
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(key, 'hex'),
    Buffer.from(iv, 'hex')
  );
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
