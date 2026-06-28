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

GitHub Pages is static, so admin changes save in the current browser first. After adding, updating, deleting records, or importing images, use "Export backup JSON" to keep a private copy. To publish those changes for everyone, use the "Export data.js" button in admin/index.html, replace this folder's data.js with the exported file, and upload the updated data.js to GitHub.

Admin image import:
Use "Import monk image" or "Import amulet image" in the admin forms. The selected image is stored inside the record so it works on GitHub Pages after exporting data.js.

Default admin passcode:
boonchai123

This passcode only hides the static admin screen from casual visitors. For real private login and automatic online saving, the site needs a backend service.
