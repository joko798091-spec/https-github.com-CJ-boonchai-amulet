BoonChai Amulet static website

Upload everything inside this folder to a GitHub repository, then enable GitHub Pages from the main branch and /root folder.

Pages:
- index.html: public home page
- store.html: amulet catalogue
- monks.html: monk catalogue
- amulet.html?id=phra-pitda: amulet detail page
- monk.html?id=luang-phor-koon: monk detail page
- admin/index.html: separated private admin for adding, updating, and deleting monks and amulets

Important:
The public catalogue pages include a search bar for finding monks and amulets by name. Admin also includes a search bar for finding records before editing or deleting.

GitHub Pages is static by itself, but this site can use Firebase Realtime Database for automatic shared records. After Firebase is connected, admin changes save online and all devices can show the same monks and amulets. Use "Export backup JSON" after important changes so you also have a private backup copy.

Automatic cloud saving:
The site uses Firebase Realtime Database. Visitor pages read catalogue data from Firebase and admin changes save online automatically. The "Push to cloud" button in admin copies the current catalogue to Firebase, which is useful after first setup or after importing a backup.

Firebase setup needed:
1. Create a Firebase project.
2. Add a Web App.
3. Enable Realtime Database.
4. Enable Email/Password Authentication.
5. Create one admin user in Firebase Authentication.
6. Paste Firebase config values into cloud-config.js.
7. Set Realtime Database rules so anyone can read, but only signed-in users can write:

{
  "rules": {
    ".read": true,
    ".write": "auth != null"
  }
}

Admin image import:
Use "Import monk image" or "Import amulet image" in the admin forms. The selected image is stored inside the record so it works on GitHub Pages after exporting data.js.

Default admin passcode:
boonchai123

This passcode only hides the static admin screen from casual visitors. For real private login and automatic online saving, the site needs a backend service.
