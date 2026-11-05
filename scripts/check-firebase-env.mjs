const required = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
];

const missing = required.filter(name => !process.env[name]?.trim());
if (missing.length) {
  console.error(`Missing Firebase configuration: ${missing.join(', ')}`);
  console.error('Set these names in repository Actions secrets or variables.');
  process.exit(1);
}
console.log('All required Firebase configuration variables are present.');
