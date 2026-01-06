const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');

try {
    let content = fs.readFileSync(envPath, 'utf8');

    const replacements = {
        '"type"': 'FIREBASE_TYPE',
        '"client_email"': 'FIREBASE_CLIENT_EMAIL',
        '"client_id"': 'FIREBASE_CLIENT_ID',
        '"auth_uri"': 'FIREBASE_AUTH_URI',
        '"token_uri"': 'FIREBASE_TOKEN_URI',
        '"auth_provider_x509_cert_url"': 'FIREBASE_AUTH_PROVIDER_X509_CERT_URL',
        '"client_x509_cert_url"': 'FIREBASE_CLIENT_X509_CERT_URL',
        '"universe_domain"': 'FIREBASE_UNIVERSE_DOMAIN',
        '"storageBucket"': 'FIREBASE_STORAGE_BUCKET'
    };

    let newContent = content.split('\n').map(line => {
        let trimmed = line.trim();
        for (const [key, envVar] of Object.entries(replacements)) {
            if (trimmed.startsWith(key)) {
                const parts = trimmed.split(':');
                if (parts.length >= 2) {
                    let val = parts.slice(1).join(':').trim();
                    if (val.startsWith('"')) val = val.substring(1);
                    if (val.endsWith(',')) val = val.substring(0, val.length - 1);
                    if (val.endsWith('"')) val = val.substring(0, val.length - 1);
                    return `${envVar}=${val}`;
                }
            }
        }
        return line;
    }).join('\n');

    fs.writeFileSync(envPath, newContent);
    console.log('Successfully updated .env');
} catch (err) {
    console.error('Error:', err);
}
