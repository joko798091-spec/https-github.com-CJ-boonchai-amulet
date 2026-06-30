(function () {
  var storageKey = "boonchaiCatalogue";
  var adminAuthKey = "boonchaiAdminUnlocked";
  var adminPasscode = "boonchai123";
  var catalogueData = readLocalData();
  var cloud = {
    enabled: false,
    ready: false,
    ref: null,
    auth: null,
    lastError: ""
  };

  function cloneSeed() {
    var seed = JSON.parse(JSON.stringify(window.BOONCHAI_SEED_DATA || { monks: [], amulets: [] }));
    if (!seed.settings) seed.settings = {};
    if (!seed.settings.whatsappNumber) seed.settings.whatsappNumber = "";
    return seed;
  }

  function readLocalData() {
    var seed = cloneSeed();
    try {
      var stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return {
        monks: Array.isArray(stored.monks) ? stored.monks : seed.monks,
        amulets: Array.isArray(stored.amulets) ? stored.amulets : seed.amulets,
        settings: stored.settings && typeof stored.settings === "object" ? stored.settings : seed.settings
      };
    } catch (error) {
      return seed;
    }
  }

  function readData() {
    return catalogueData;
  }

  function saveData(data) {
    catalogueData = data;
    localStorage.setItem(storageKey, JSON.stringify(data));
    if (cloud.ready && isAdminArea() && sessionStorage.getItem(adminAuthKey) === "yes") {
      return cloud.ref.set(data).catch(function (error) {
        cloud.lastError = error.message || String(error);
        alert("Cloud save failed: " + cloud.lastError);
      });
    }
    return Promise.resolve();
  }

  function pushCatalogueToCloud(data) {
    if (!cloud.ready || !cloud.ref) {
      alert("Cloud is not ready yet. Please check Firebase setup first.");
      return;
    }
    cloud.ref.set(data).then(function () {
      alert("Catalogue pushed to cloud. Other devices will now show the same records.");
    }).catch(function (error) {
      cloud.lastError = error.message || String(error);
      alert("Cloud sync failed: " + cloud.lastError);
    });
  }

  function hasFirebaseConfig() {
    var config = window.BOONCHAI_FIREBASE_CONFIG || {};
    return !!(config.apiKey && config.databaseURL && config.projectId);
  }

  function initCloudSync() {
    if (!hasFirebaseConfig() || !window.firebase) return;
    try {
      if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(window.BOONCHAI_FIREBASE_CONFIG);
      cloud.ref = firebase.database().ref("catalogue");
      cloud.auth = firebase.auth ? firebase.auth() : null;
      cloud.enabled = true;
      cloud.ready = true;
      cloud.ref.on("value", function (snapshot) {
        var data = snapshot.val();
        if (!data || !Array.isArray(data.monks) || !Array.isArray(data.amulets)) return;
        if (!data.settings || typeof data.settings !== "object") data.settings = {};
        if (!data.settings.whatsappNumber) data.settings.whatsappNumber = "";
        catalogueData = data;
        localStorage.setItem(storageKey, JSON.stringify(data));
        renderAll();
      }, function (error) {
        cloud.lastError = error.message || String(error);
      });
    } catch (error) {
      cloud.lastError = error.message || String(error);
    }
  }

  function cloudStatusHtml() {
    if (!hasFirebaseConfig()) {
      return '<p class="helper-text">Cloud auto-sync is not connected yet. Add Firebase settings in cloud-config.js to make changes appear on every device automatically.</p>';
    }
    if (cloud.ready) {
      return '<p class="helper-text">Cloud auto-sync is connected. Admin changes save online automatically.</p>';
    }
    return '<p class="helper-text">Cloud settings found, but connection is not ready yet. ' + escapeHtml(cloud.lastError) + '</p>';
  }

  function isAdminArea() {
    return !!byId("adminShell");
  }

  function pagePath(page) {
    return isAdminArea() ? "../" + page : page;
  }

  function assetPath(path) {
    if (!path || /^https?:\/\//i.test(path) || /^data:/i.test(path)) return path;
    return isAdminArea() ? "../" + path : path;
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function text(value, fallback) {
    return value && String(value).trim() ? String(value).trim() : fallback;
  }

  function slugify(value) {
    return text(value, "item")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "item";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function monkName(data, monkId) {
    var monk = data.monks.find(function (item) { return item.id === monkId; });
    return monk ? monk.name : "Unassigned";
  }

  function cardImage(item) {
    return escapeHtml(assetPath(item.image || "image/logo.png"));
  }

  function renderNav() {
    var nav = byId("navlinks");
    if (!nav) return;
    nav.innerHTML = [
      '<button class="close-button" type="button" aria-label="Close menu" onclick="hideMenu()">Close</button>',
      '<a href="' + pagePath("index.html") + '">Home</a>',
      '<a href="' + pagePath("store.html") + '">Amulets</a>',
      '<a href="' + pagePath("monks.html") + '">Monks</a>'
    ].join("");
  }

  function renderHome() {
    var grid = byId("featuredAmulets");
    if (!grid) return;
    var data = readData();
    grid.innerHTML = data.amulets.slice(0, 4).map(function (amulet) {
      return [
        '<article class="collection-card">',
        '<a href="' + pagePath("amulet.html") + '?id=' + encodeURIComponent(amulet.id) + '" aria-label="View ' + escapeHtml(amulet.name) + '">',
        '<img src="' + cardImage(amulet) + '" alt="' + escapeHtml(amulet.name) + '">',
        '</a>',
        '<div>',
        '<h3><a href="' + pagePath("amulet.html") + '?id=' + encodeURIComponent(amulet.id) + '">' + escapeHtml(amulet.name) + '</a></h3>',
        '<p>' + escapeHtml(text(amulet.short, "Amulet detail")) + '</p>',
        '<a class="collection-detail-link" href="' + pagePath("amulet.html") + '?id=' + encodeURIComponent(amulet.id) + '">View detail</a>',
        '</div>',
        '</article>'
      ].join("");
    }).join("") || emptyCard("No amulets yet.");
  }

  function itemMatches(value, query) {
    return String(value || "").toLowerCase().indexOf(query) !== -1;
  }

  function catalogueMatches(data, query) {
    var monkResults = data.monks.filter(function (monk) {
      return itemMatches(monk.name, query);
    }).map(function (monk) {
      return {
        href: pagePath("monk.html") + "?id=" + encodeURIComponent(monk.id),
        image: cardImage(monk),
        title: monk.name,
        type: "Monk",
        meta: text(monk.temple, "Monk profile")
      };
    });

    var amuletResults = data.amulets.filter(function (amulet) {
      return itemMatches(amulet.name, query);
    }).map(function (amulet) {
      return {
        href: pagePath("amulet.html") + "?id=" + encodeURIComponent(amulet.id),
        image: cardImage(amulet),
        title: amulet.name,
        type: "Amulet",
        meta: monkName(data, amulet.monkId)
      };
    });

    return amuletResults.concat(monkResults);
  }

  function pageSearchMode() {
    if (byId("amuletGrid")) return "amulets";
    if (byId("monkGrid")) return "monks";
    return "all";
  }

  function pageSearchMatches(data, query, mode) {
    if (mode === "amulets") {
      return data.amulets.filter(function (amulet) {
        return itemMatches(amulet.name, query);
      }).map(function (amulet) {
        return {
          href: pagePath("amulet.html") + "?id=" + encodeURIComponent(amulet.id),
          image: cardImage(amulet),
          title: amulet.name,
          type: "Amulet",
          meta: monkName(data, amulet.monkId)
        };
      });
    }
    if (mode === "monks") {
      return data.monks.filter(function (monk) {
        return itemMatches(monk.name, query);
      }).map(function (monk) {
        return {
          href: pagePath("monk.html") + "?id=" + encodeURIComponent(monk.id),
          image: cardImage(monk),
          title: monk.name,
          type: "Monk",
          meta: text(monk.temple, "Monk profile")
        };
      });
    }
    return catalogueMatches(data, query);
  }

  function setupCatalogueSearch() {
    var input = byId("catalogueSearch");
    var results = byId("searchResults");
    if (!input || !results) return;
    var data = readData();
    var mode = pageSearchMode();
    var itemLabel = mode === "amulets" ? "amulets" : mode === "monks" ? "monks" : "amulets and monks";

    function renderSearch() {
      var query = input.value.trim().toLowerCase();
      if (!query) {
        results.innerHTML = '<p class="helper-text">Start typing to find ' + itemLabel + ' by name.</p>';
        return;
      }

      var matches = pageSearchMatches(data, query, mode);
      results.innerHTML = matches.length ? matches.map(function (item) {
        return '<a class="search-result-item" href="' + item.href + '"><img src="' + item.image + '" alt=""><span><strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(item.type + " / " + item.meta) + '</small></span></a>';
      }).join("") : '<p class="helper-text">No ' + itemLabel + ' found for "' + escapeHtml(input.value) + '".</p>';
    }

    input.addEventListener("input", renderSearch);
    renderSearch();
  }

  function emptyCard(message, href, label) {
    var action = href ? '<a class="primary-button" href="' + href + '">' + escapeHtml(label) + '</a>' : "";
    return '<div class="empty-catalogue"><p>' + escapeHtml(message) + '</p>' + action + '</div>';
  }

  function renderAmuletList() {
    var grid = byId("amuletGrid");
    if (!grid) return;
    var data = readData();
    grid.innerHTML = data.amulets.map(function (amulet) {
      return [
        '<article class="product-card">',
        '<a class="product-image-link" href="' + pagePath("amulet.html") + '?id=' + encodeURIComponent(amulet.id) + '" aria-label="View ' + escapeHtml(amulet.name) + '">',
        '<img src="' + cardImage(amulet) + '" alt="' + escapeHtml(amulet.name) + '">',
        '</a>',
        '<div class="product-info">',
        '<p class="product-type">' + escapeHtml(text(amulet.type, "Amulet")) + '</p>',
        '<h2><a href="' + pagePath("amulet.html") + '?id=' + encodeURIComponent(amulet.id) + '">' + escapeHtml(amulet.name) + '</a></h2>',
        '<p>' + escapeHtml(text(amulet.short, "Amulet detail")) + '</p>',
        '<div class="product-meta"><span>' + escapeHtml(monkName(data, amulet.monkId)) + '</span><strong>' + escapeHtml(stockLabel(amulet)) + '</strong></div>',
        '<a class="detail-link" href="' + pagePath("amulet.html") + '?id=' + encodeURIComponent(amulet.id) + '">View detail</a>',
        '</div>',
        '</article>'
      ].join("");
    }).join("") || emptyCard("No amulets yet.");
  }

  function renderMonkList() {
    var grid = byId("monkGrid");
    if (!grid) return;
    var data = readData();
    grid.innerHTML = data.monks.map(function (monk) {
      var count = data.amulets.filter(function (amulet) { return amulet.monkId === monk.id; }).length;
      return [
        '<article class="product-card">',
        '<a class="product-image-link" href="' + pagePath("monk.html") + '?id=' + encodeURIComponent(monk.id) + '" aria-label="View ' + escapeHtml(monk.name) + '">',
        '<img src="' + cardImage(monk) + '" alt="' + escapeHtml(monk.name) + '">',
        '</a>',
        '<div class="product-info">',
        '<p class="product-type">Monk Profile</p>',
        '<h2><a href="' + pagePath("monk.html") + '?id=' + encodeURIComponent(monk.id) + '">' + escapeHtml(monk.name) + '</a></h2>',
        '<p>' + escapeHtml(text(monk.short, "Monk detail")) + '</p>',
        '<div class="product-meta"><span>' + count + ' amulet' + (count === 1 ? "" : "s") + '</span><strong>Profile</strong></div>',
        '<a class="detail-link" href="' + pagePath("monk.html") + '?id=' + encodeURIComponent(monk.id) + '">View monk</a>',
        '</div>',
        '</article>'
      ].join("");
    }).join("") || emptyCard("No monks yet.");
  }

  function renderAmuletDetail() {
    var target = byId("amuletDetail");
    if (!target) return;
    var data = readData();
    var amulet = data.amulets.find(function (item) { return item.id === getParam("id"); });
    if (!amulet) {
      target.innerHTML = notFound("Amulet not found", "store.html", "Back to amulets");
      return;
    }
    var monk = data.monks.find(function (item) { return item.id === amulet.monkId; });
    document.title = amulet.name + " | BoonChai";
    target.innerHTML = [
      '<section class="detail-layout">',
      '<div class="detail-image-panel"><img src="' + cardImage(amulet) + '" alt="' + escapeHtml(amulet.name) + '"></div>',
      '<article class="detail-content">',
      '<p class="product-type">' + escapeHtml(text(amulet.type, "Amulet")) + '</p>',
      '<h1>' + escapeHtml(amulet.name) + '</h1>',
      '<p class="detail-lead">' + escapeHtml(text(amulet.short, "Amulet detail")) + '</p>',
      '<dl class="detail-specs">',
      spec("Monk", monk ? '<a class="inline-detail-link" href="' + pagePath("monk.html") + '?id=' + encodeURIComponent(monk.id) + '">' + escapeHtml(monk.name) + '</a>' : "Unassigned"),
      spec("Temple", escapeHtml(text(amulet.temple, "Not set"))),
      spec("Year", escapeHtml(text(amulet.year, "Not set"))),
      spec("Material", escapeHtml(text(amulet.material, "Not set"))),
      spec("Condition", escapeHtml(text(amulet.condition, "Not set"))),
      spec("Stock", escapeHtml(stockLabel(amulet))),
      '</dl>',
      '<div class="detail-description"><h2>Description</h2><p>' + escapeHtml(text(amulet.detail, "No description added yet.")) + '</p></div>',
      '<div class="detail-actions">' + whatsappButton(data, amulet) + '<a class="primary-button" href="store.html">Back to Amulets</a><a class="secondary-admin-button" href="monks.html">View Monks</a></div>',
      '</article>',
      '</section>'
    ].join("");
  }

  function stockLabel(amulet) {
    var value = text(amulet.stock, "");
    if (value === "out-of-stock") return "Out of stock";
    if (!value) return "Stock not set";
    return value + " in stock";
  }

  function cleanWhatsappNumber(value) {
    return String(value || "").replace(/[^\d]/g, "");
  }

  function whatsappButton(data, amulet) {
    var number = cleanWhatsappNumber(data.settings && data.settings.whatsappNumber);
    if (!number) return "";
    var message = [
      "Hello BoonChai, I want to order this amulet:",
      amulet.name,
      "Code: " + amulet.id,
      "Page: " + window.location.href
    ].join("\n");
    return '<a class="primary-button whatsapp-button" target="_blank" rel="noopener" href="https://wa.me/' + encodeURIComponent(number) + '?text=' + encodeURIComponent(message) + '">Order on WhatsApp</a>';
  }

  function renderMonkDetail() {
    var target = byId("monkDetail");
    if (!target) return;
    var data = readData();
    var monk = data.monks.find(function (item) { return item.id === getParam("id"); });
    if (!monk) {
      target.innerHTML = notFound("Monk not found", "monks.html", "Back to monks");
      return;
    }
    var linked = data.amulets.filter(function (amulet) { return amulet.monkId === monk.id; });
    document.title = monk.name + " | BoonChai";
    target.innerHTML = [
      '<section class="detail-layout">',
      '<div class="detail-image-panel"><img src="' + cardImage(monk) + '" alt="' + escapeHtml(monk.name) + '"></div>',
      '<article class="detail-content">',
      '<p class="product-type">Monk Profile</p>',
      '<h1>' + escapeHtml(monk.name) + '</h1>',
      '<p class="detail-lead">' + escapeHtml(text(monk.short, "Monk detail")) + '</p>',
      '<dl class="detail-specs">',
      spec("Temple", escapeHtml(text(monk.temple, "Not set"))),
      spec("Province", escapeHtml(text(monk.province, "Not set"))),
      spec("Years", escapeHtml(text(monk.years, "Not set"))),
      spec("Connected Amulets", String(linked.length)),
      '</dl>',
      '<div class="detail-description"><h2>Monk Detail</h2><p>' + escapeHtml(text(monk.detail, "No monk detail added yet.")) + '</p></div>',
      '<div class="detail-description"><h2>Connected Amulets</h2>' + linkedAmulets(linked) + '</div>',
      '<div class="detail-actions"><a class="primary-button" href="monks.html">Back to Monks</a><a class="secondary-admin-button" href="store.html">View Amulets</a></div>',
      '</article>',
      '</section>'
    ].join("");
  }

  function spec(label, value) {
    return '<div><dt>' + escapeHtml(label) + '</dt><dd>' + value + '</dd></div>';
  }

  function linkedAmulets(items) {
    if (!items.length) return '<p class="helper-text">No amulets linked yet.</p>';
    return '<div class="linked-amulet-list">' + items.map(function (amulet) {
      return '<a href="' + pagePath("amulet.html") + '?id=' + encodeURIComponent(amulet.id) + '"><img src="' + cardImage(amulet) + '" alt="' + escapeHtml(amulet.name) + '"><span><strong>' + escapeHtml(amulet.name) + '</strong><small>' + escapeHtml(text(amulet.type, "Amulet")) + '</small></span></a>';
    }).join("") + '</div>';
  }

  function notFound(title, href, label) {
    return '<section class="not-found-panel"><h1>' + escapeHtml(title) + '</h1><p class="detail-lead">This item is not in the catalogue.</p><div class="detail-actions"><a class="primary-button" href="' + href + '">' + escapeHtml(label) + '</a></div></section>';
  }

  function setupAdmin() {
    var shell = byId("adminShell");
    if (!shell) return;
    if (sessionStorage.getItem(adminAuthKey) !== "yes") {
      renderAdminLogin(shell);
      return;
    }
    var data = readData();
    renderAdmin(shell, data, null, null);
  }

  function renderAdminLogin(shell) {
    shell.innerHTML = [
      '<form class="admin-form login-panel" id="adminLogin">',
      '<h2>Admin Login</h2>',
      '<p class="helper-text">This admin area is separated from the visitor website. Enter your passcode to manage monks and amulets on this browser.</p>',
      cloudStatusHtml(),
      '<label for="adminPasscode">Passcode<input id="adminPasscode" name="adminPasscode" type="password" autocomplete="current-password" placeholder="Enter passcode"></label>',
      hasFirebaseConfig() ? '<label for="adminEmail">Firebase admin email<input id="adminEmail" name="adminEmail" type="email" autocomplete="username" placeholder="your@email.com"></label><label for="adminPassword">Firebase admin password<input id="adminPassword" name="adminPassword" type="password" autocomplete="current-password" placeholder="Firebase password"></label>' : '',
      '<p class="helper-text" id="loginMessage"></p>',
      '<div class="form-actions"><button class="primary-button" type="submit">Enter Admin</button><a class="secondary-admin-button" href="../index.html">Back to Website</a></div>',
      '</form>'
    ].join("");
    byId("adminLogin").addEventListener("submit", function (event) {
      event.preventDefault();
      if (byId("adminPasscode").value !== adminPasscode) {
        byId("loginMessage").textContent = "Wrong passcode.";
        return;
      }
      if (cloud.ready && cloud.auth && byId("adminEmail") && byId("adminPassword")) {
        cloud.auth.signInWithEmailAndPassword(byId("adminEmail").value, byId("adminPassword").value).then(function () {
          sessionStorage.setItem(adminAuthKey, "yes");
          setupAdmin();
        }).catch(function (error) {
          byId("loginMessage").textContent = "Firebase login failed: " + (error.message || String(error));
        });
      } else {
        sessionStorage.setItem(adminAuthKey, "yes");
        setupAdmin();
      }
    });
  }

  function renderAdmin(shell, data, editType, editId) {
    var editingMonk = editType === "monk" ? data.monks.find(function (item) { return item.id === editId; }) : null;
    var editingAmulet = editType === "amulet" ? data.amulets.find(function (item) { return item.id === editId; }) : null;
    shell.innerHTML = [
      '<div class="notice success"><strong>Private catalogue records</strong>' + cloudStatusHtml() + '<p class="helper-text">New monks and amulets are recorded in this browser' + (cloud.ready ? " and saved to Firebase automatically. Use Push to cloud once to copy the current catalogue online." : ".") + ' Keep exporting a backup after important changes.</p>' + (cloud.ready ? '<button class="secondary-admin-button" id="pushCloud" type="button">Push to cloud</button>' : '') + '<button class="secondary-admin-button" id="exportData" type="button">Export data.js</button><button class="secondary-admin-button" id="exportBackup" type="button">Export backup JSON</button><label class="secondary-admin-button import-button" for="importBackup">Import backup<input id="importBackup" type="file" accept=".json,.js,application/json"></label><button class="secondary-admin-button" id="logoutAdmin" type="button">Logout</button><button class="secondary-admin-button" id="resetData" type="button">Reset sample data</button></div>',
      '<div class="admin-panels">',
      monkForm(data, editingMonk),
      amuletForm(data, editingAmulet),
      settingsForm(data),
      '</div>',
      '<section class="stored-list admin-list"><div class="stored-list-heading"><h2>Current Catalogue</h2><span>' + data.monks.length + ' monks / ' + data.amulets.length + ' amulets</span></div><div class="admin-record-search"><label for="adminCatalogueSearch">Search catalogue</label><input id="adminCatalogueSearch" type="search" placeholder="Type amulet or monk name"></div><div class="admin-current-grid" id="adminCurrentGrid">' + currentItems(data) + '</div></section>'
    ].join("");
    bindAdmin(data, editingMonk, editingAmulet);
  }

  function settingsForm(data) {
    var settings = data.settings || {};
    return [
      '<form class="admin-form settings-form" id="settingsForm">',
      '<h2>Website Settings</h2>',
      '<div class="form-grid">',
      input("whatsappNumber", "WhatsApp order number", "60123456789", settings.whatsappNumber),
      '</div>',
      '<p class="helper-text">Use country code without +, spaces, or dashes. Example: 60123456789.</p>',
      '<div class="form-actions"><button class="primary-button" type="submit">Save Settings</button></div>',
      '</form>'
    ].join("");
  }

  function monkForm(data, editingMonk) {
    var monk = editingMonk || {};
    return [
      '<form class="admin-form" id="monkForm" data-edit-id="' + escapeHtml(monk.id || "") + '">',
      '<h2>' + (editingMonk ? "Update Monk" : "New Monk") + '</h2>',
      '<div class="form-grid">',
      input("monkName", "Monk name", "Luang Phor Example", monk.name),
      input("monkTemple", "Temple", "Wat Example", monk.temple),
      input("monkProvince", "Province", "Bangkok", monk.province),
      input("monkYears", "Years", "1900-1980", monk.years),
      input("monkImage", "Image path or URL", "image/monks/photo.png", monk.image),
      imageImport("monkImageFile", "Import monk image"),
      input("monkShort", "Short detail", "Known for protective blessings", monk.short),
      '</div>',
      textarea("monkDetail", "Monk full detail", monk.detail),
      '<div class="form-actions"><button class="primary-button" type="submit">' + (editingMonk ? "Update Monk" : "Add Monk") + '</button>' + (editingMonk ? '<button class="secondary-admin-button" id="cancelMonkEdit" type="button">Cancel Edit</button>' : "") + '</div>',
      '</form>'
    ].join("");
  }

  function amuletForm(data, editingAmulet) {
    var amulet = editingAmulet || {};
    return [
      '<form class="admin-form" id="amuletForm" data-edit-id="' + escapeHtml(amulet.id || "") + '">',
      '<h2>' + (editingAmulet ? "Update Amulet" : "New Amulet") + '</h2>',
      '<div class="form-grid">',
      input("amuletName", "Amulet name", "Phra Somdej", amulet.name),
      selectMonk(data, amulet.monkId),
      input("amuletType", "Type", "Phra Somdej", amulet.type),
      input("amuletTemple", "Temple", "Wat Example", amulet.temple),
      input("amuletYear", "Year", "BE 2500", amulet.year),
      input("amuletMaterial", "Material", "Sacred powder", amulet.material),
      input("amuletCondition", "Condition", "Good", amulet.condition),
      stockControl(amulet),
      input("amuletImage", "Image path or URL", "image/amulets/photo.webp", amulet.image),
      imageImport("amuletImageFile", "Import amulet image"),
      input("amuletShort", "Short detail", "A collectible amulet with temple history", amulet.short),
      '</div>',
      textarea("amuletDetail", "Amulet full detail", amulet.detail),
      '<div class="form-actions"><button class="primary-button" type="submit">' + (editingAmulet ? "Update Amulet" : "Add Amulet") + '</button>' + (editingAmulet ? '<button class="secondary-admin-button" id="cancelAmuletEdit" type="button">Cancel Edit</button>' : "") + '</div>',
      '</form>'
    ].join("");
  }

  function input(id, label, placeholder, value) {
    return '<label for="' + id + '">' + label + '<input id="' + id + '" name="' + id + '" placeholder="' + escapeHtml(placeholder) + '" value="' + escapeHtml(value || "") + '"></label>';
  }

  function stockControl(amulet) {
    var isOut = amulet.stock === "out-of-stock";
    return [
      '<div class="stock-control">',
      '<label for="amuletStock">Stock amount<input id="amuletStock" name="amuletStock" type="number" min="0" step="1" placeholder="1" value="' + escapeHtml(isOut ? "" : amulet.stock || "") + '"></label>',
      '<label for="amuletStockStatus">Stock status<select id="amuletStockStatus" name="amuletStockStatus">',
      '<option value="in-stock"' + (isOut ? "" : " selected") + '>In stock</option>',
      '<option value="out-of-stock"' + (isOut ? " selected" : "") + '>Out of stock</option>',
      '</select></label>',
      '</div>'
    ].join("");
  }

  function textarea(id, label, value) {
    return '<label for="' + id + '">' + label + '<textarea id="' + id + '" name="' + id + '" rows="5">' + escapeHtml(value || "") + '</textarea></label>';
  }

  function imageImport(id, label) {
    return '<label class="image-import-field" for="' + id + '">' + label + '<input id="' + id + '" type="file" accept="image/*"><span class="helper-text">Choose an image from your computer. It will be stored with this record.</span><img class="image-import-preview" id="' + id + 'Preview" alt=""></label>';
  }

  function selectMonk(data, selectedId) {
    return '<label for="amuletMonk">Monk<select id="amuletMonk" name="amuletMonk"><option value="">Unassigned</option>' + data.monks.map(function (monk) {
      return '<option value="' + escapeHtml(monk.id) + '"' + (monk.id === selectedId ? " selected" : "") + '>' + escapeHtml(monk.name) + '</option>';
    }).join("") + '</select></label>';
  }

  function currentItems(data, query) {
    var search = String(query || "").toLowerCase();
    var monks = data.monks.filter(function (monk) {
      return !search || itemMatches(monk.name, search);
    }).map(function (monk) {
      var linked = data.amulets.filter(function (amulet) { return amulet.monkId === monk.id; }).length;
      return '<article class="stored-list-item admin-record"><a class="admin-record-link" href="../monk.html?id=' + encodeURIComponent(monk.id) + '"><img src="' + cardImage(monk) + '" alt=""><span><strong>' + escapeHtml(monk.name) + '</strong><small>Monk profile / ' + linked + ' amulet' + (linked === 1 ? "" : "s") + '</small></span></a><div class="admin-record-actions"><button class="secondary-admin-button compact-button" type="button" data-edit-monk="' + escapeHtml(monk.id) + '">Edit</button><button class="danger-button compact-button" type="button" data-delete-monk="' + escapeHtml(monk.id) + '">Delete</button></div></article>';
    });
    var amulets = data.amulets.filter(function (amulet) {
      return !search || itemMatches(amulet.name, search);
    }).map(function (amulet) {
      return '<article class="stored-list-item admin-record"><a class="admin-record-link" href="../amulet.html?id=' + encodeURIComponent(amulet.id) + '"><img src="' + cardImage(amulet) + '" alt=""><span><strong>' + escapeHtml(amulet.name) + '</strong><small>' + escapeHtml(monkName(data, amulet.monkId)) + '</small></span></a><div class="admin-record-actions"><button class="secondary-admin-button compact-button" type="button" data-edit-amulet="' + escapeHtml(amulet.id) + '">Edit</button><button class="danger-button compact-button" type="button" data-delete-amulet="' + escapeHtml(amulet.id) + '">Delete</button></div></article>';
    });
    return monks.concat(amulets).join("") || '<div class="empty-catalogue"><p>No catalogue item found.</p></div>';
  }

  function setupAdminSearch(data) {
    var input = byId("adminCatalogueSearch");
    var grid = byId("adminCurrentGrid");
    if (!input || !grid) return;

    input.addEventListener("input", function () {
      var query = input.value.trim().toLowerCase();
      grid.innerHTML = currentItems(data, query);
      bindAdminRecordButtons(data);
    });
  }

  function bindAdmin(data, editingMonk, editingAmulet) {
    bindImageImport("monkImageFile", "monkImage");
    bindImageImport("amuletImageFile", "amuletImage");
    setupAdminSearch(data);

    byId("settingsForm").addEventListener("submit", function (event) {
      event.preventDefault();
      data.settings = data.settings || {};
      data.settings.whatsappNumber = cleanWhatsappNumber(byId("whatsappNumber").value);
      saveData(data);
      renderAdmin(byId("adminShell"), data, null, null);
    });

    byId("monkForm").addEventListener("submit", function (event) {
      event.preventDefault();
      var name = text(byId("monkName").value, "New Monk");
      var editId = byId("monkForm").getAttribute("data-edit-id");
      var monk = editId ? data.monks.find(function (item) { return item.id === editId; }) : null;
      var record = monk || {};
      Object.assign(record, {
        id: monk ? monk.id : uniqueId(data.monks, slugify(name)),
        name: name,
        temple: byId("monkTemple").value,
        province: byId("monkProvince").value,
        years: byId("monkYears").value,
        image: text(byId("monkImage").value, "image/logo.png"),
        short: byId("monkShort").value,
        detail: byId("monkDetail").value
      });
      if (!monk) data.monks.push(record);
      saveData(data);
      renderAdmin(byId("adminShell"), data, null, null);
    });

    byId("amuletForm").addEventListener("submit", function (event) {
      event.preventDefault();
      var name = text(byId("amuletName").value, "New Amulet");
      var editId = byId("amuletForm").getAttribute("data-edit-id");
      var amulet = editId ? data.amulets.find(function (item) { return item.id === editId; }) : null;
      var record = amulet || {};
      Object.assign(record, {
        id: amulet ? amulet.id : uniqueId(data.amulets, slugify(name)),
        name: name,
        monkId: byId("amuletMonk").value,
        type: byId("amuletType").value,
        temple: byId("amuletTemple").value,
        year: byId("amuletYear").value,
        material: byId("amuletMaterial").value,
        condition: byId("amuletCondition").value,
        stock: byId("amuletStockStatus").value === "out-of-stock" ? "out-of-stock" : byId("amuletStock").value,
        image: text(byId("amuletImage").value, "image/logo.png"),
        short: byId("amuletShort").value,
        detail: byId("amuletDetail").value
      });
      if (!amulet) data.amulets.push(record);
      saveData(data);
      renderAdmin(byId("adminShell"), data, null, null);
    });

    if (editingMonk && byId("cancelMonkEdit")) {
      byId("cancelMonkEdit").addEventListener("click", function () {
        renderAdmin(byId("adminShell"), data, null, null);
      });
    }

    if (editingAmulet && byId("cancelAmuletEdit")) {
      byId("cancelAmuletEdit").addEventListener("click", function () {
        renderAdmin(byId("adminShell"), data, null, null);
      });
    }

    bindAdminRecordButtons(data);

    if (byId("pushCloud")) {
      byId("pushCloud").addEventListener("click", function () {
        pushCatalogueToCloud(data);
      });
    }

    byId("exportData").addEventListener("click", function () {
      var payload = "window.BOONCHAI_SEED_DATA = " + JSON.stringify(data, null, 2) + ";\n";
      downloadFile(payload, "data.js", "text/javascript");
    });

    byId("exportBackup").addEventListener("click", function () {
      downloadFile(JSON.stringify(data, null, 2), "boonchai-catalogue-backup.json", "application/json");
    });

    byId("importBackup").addEventListener("change", function (event) {
      var file = event.target.files && event.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var imported = parseImport(reader.result);
        if (!imported) {
          alert("The selected file does not look like BoonChai catalogue data.");
          return;
        }
        saveData(imported);
        renderAdmin(byId("adminShell"), imported, null, null);
      };
      reader.readAsText(file);
    });

    byId("logoutAdmin").addEventListener("click", function () {
      sessionStorage.removeItem(adminAuthKey);
      if (cloud.auth) cloud.auth.signOut().catch(function () {});
      setupAdmin();
    });

    byId("resetData").addEventListener("click", function () {
      localStorage.removeItem(storageKey);
      window.location.reload();
    });
  }

  function bindAdminRecordButtons(data) {
    Array.from(document.querySelectorAll("[data-edit-monk]")).forEach(function (button) {
      button.addEventListener("click", function () {
        renderAdmin(byId("adminShell"), data, "monk", button.getAttribute("data-edit-monk"));
      });
    });

    Array.from(document.querySelectorAll("[data-edit-amulet]")).forEach(function (button) {
      button.addEventListener("click", function () {
        renderAdmin(byId("adminShell"), data, "amulet", button.getAttribute("data-edit-amulet"));
      });
    });

    Array.from(document.querySelectorAll("[data-delete-monk]")).forEach(function (button) {
      button.addEventListener("click", function () {
        var monkId = button.getAttribute("data-delete-monk");
        var monk = data.monks.find(function (item) { return item.id === monkId; });
        var linked = data.amulets.filter(function (amulet) { return amulet.monkId === monkId; }).length;
        if (!monk) return;
        var message = linked ? "Delete " + monk.name + "? " + linked + " linked amulet(s) will become unassigned." : "Delete " + monk.name + "?";
        if (!window.confirm(message)) return;
        data.monks = data.monks.filter(function (item) { return item.id !== monkId; });
        data.amulets.forEach(function (amulet) {
          if (amulet.monkId === monkId) amulet.monkId = "";
        });
        saveData(data);
        renderAdmin(byId("adminShell"), data, null, null);
      });
    });

    Array.from(document.querySelectorAll("[data-delete-amulet]")).forEach(function (button) {
      button.addEventListener("click", function () {
        var amuletId = button.getAttribute("data-delete-amulet");
        var amulet = data.amulets.find(function (item) { return item.id === amuletId; });
        if (!amulet || !window.confirm("Delete " + amulet.name + "?")) return;
        data.amulets = data.amulets.filter(function (item) { return item.id !== amuletId; });
        saveData(data);
        renderAdmin(byId("adminShell"), data, null, null);
      });
    });
  }

  function bindImageImport(fileInputId, targetInputId) {
    var fileInput = byId(fileInputId);
    var targetInput = byId(targetInputId);
    var preview = byId(fileInputId + "Preview");
    if (!fileInput || !targetInput) return;

    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      imageFileToDataUrl(file, function (dataUrl) {
        targetInput.value = dataUrl;
        if (preview) {
          preview.src = dataUrl;
          preview.classList.add("is-visible");
        }
      });
    });
  }

  function imageFileToDataUrl(file, callback) {
    var reader = new FileReader();
    reader.onload = function () {
      var image = new Image();
      image.onload = function () {
        var maxSize = 1200;
        var scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        var width = Math.max(1, Math.round(image.width * scale));
        var height = Math.max(1, Math.round(image.height * scale));
        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(image, 0, 0, width, height);
        callback(canvas.toDataURL("image/jpeg", 0.86));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function downloadFile(content, filename, type) {
    var blob = new Blob([content], { type: type });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function parseImport(source) {
    try {
      var cleaned = String(source)
        .replace(/^\s*window\.BOONCHAI_SEED_DATA\s*=\s*/, "")
        .replace(/;\s*$/, "");
      var data = JSON.parse(cleaned);
      if (Array.isArray(data.monks) && Array.isArray(data.amulets)) return data;
    } catch (error) {
      return null;
    }
    return null;
  }

  function uniqueId(items, base) {
    var id = base;
    var count = 2;
    while (items.some(function (item) { return item.id === id; })) {
      id = base + "-" + count;
      count += 1;
    }
    return id;
  }

  window.showMenu = function () {
    var nav = byId("navlinks");
    if (nav) nav.classList.add("is-open");
  };

  window.hideMenu = function () {
    var nav = byId("navlinks");
    if (nav) nav.classList.remove("is-open");
  };

  document.addEventListener("DOMContentLoaded", function () {
    initCloudSync();
    renderAll();
  });

  function renderAll() {
    renderNav();
    renderHome();
    renderAmuletList();
    renderMonkList();
    renderAmuletDetail();
    renderMonkDetail();
    setupCatalogueSearch();
    setupAdmin();
  }
})();
