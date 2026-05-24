const form = document.getElementById("form");
const scanInput = document.getElementById("scanInput");
const scanResult = document.getElementById("scanResult");
const clearBtn = document.getElementById("clearBtn");
const labelSize = document.getElementById("labelSize");
const labelWidth = document.getElementById("labelWidth");
const labelHeight = document.getElementById("labelHeight");
const label = document.getElementById("label");
const scanDetails = document.getElementById("scanDetails");

const firebaseConfig = {
  apiKey: "AIzaSyBocR8I0Wq12rrIqNmvKpc7J6LMViYBoj4",
  authDomain: "transport-barcode.firebaseapp.com",
  databaseURL: "https://transport-barcode-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "transport-barcode",
  storageBucket: "transport-barcode.firebasestorage.app",
  messagingSenderId: "1021240605132",
  appId: "1:1021240605132:web:90d3eb129030a60fdbc569",
  measurementId: "G-JQ0J1ZMXM7"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const fields = {
  docketNo: "Docket No.",
  date: "Date",
  time: "Time",
  scanStatus: "Scan Status",
  fromPlace: "From",
  toPlace: "To",
  quantity: "Quantity",
  transporter: "Transporter",
  vehicleNo: "Vehicle No.",
  receiver: "Receiver",
  remarks: "Remarks"
};

const labelPresets = {
  "100x50": { width: 100, height: 50, columns: 1, shape: "rect" },
  "75x50": { width: 75, height: 50, columns: 1, shape: "rect" },
  "50x25": { width: 50, height: 25, columns: 1, shape: "rect" },
  "50x25-2up": { width: 100, height: 25, columns: 2, shape: "rect" },
  "100x75": { width: 100, height: 75, columns: 1, shape: "rect" },
  "circle-25": { width: 25.4, height: 25.4, columns: 1, shape: "circle" },
  "circle-38": { width: 38, height: 38, columns: 1, shape: "circle" },
  "circle-50": { width: 50, height: 50, columns: 1, shape: "circle" }
};

function setTodayDate() {
  form.date.value = new Date().toISOString().slice(0, 10);
}

function setCurrentTime() {
  const now = new Date();
  form.time.value =
    String(now.getHours()).padStart(2, "0") + ":" +
    String(now.getMinutes()).padStart(2, "0");
}

function getRecord() {
  return Object.fromEntries(new FormData(form).entries());
}

function getKey(docketNo) {
  return btoa(unescape(encodeURIComponent(docketNo)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function saveRecord(record) {
  const key = getKey(record.docketNo);
  await db.ref("records/" + key).set({
    ...record,
    updatedAt: new Date().toISOString()
  });
}

async function findRecord(docketNo) {
  const key = getKey(docketNo);
  const snapshot = await db.ref("records/" + key).get();
  return snapshot.exists() ? snapshot.val() : null;
}

function renderDetails(target, record) {
  target.innerHTML = "";

  Object.entries(fields).forEach(([key, labelText]) => {
    const row = document.createElement("div");
    row.className = "details-row";
    row.innerHTML = `<span class="details-key">${labelText}</span><span class="details-value"></span>`;
    row.querySelector(".details-value").textContent = record[key] || "-";
    target.appendChild(row);
  });
}

function syncCopies(columns) {
  const copy = label.querySelector(".label-copy");
  const currentCopies = label.querySelectorAll(".label-copy").length;

  if (columns === currentCopies) return;

  label.innerHTML = "";

  for (let index = 0; index < columns; index++) {
    const clone = copy.cloneNode(true);
    clone.querySelector("svg").id = index === 0 ? "barcode" : `barcode-${index + 1}`;
    label.appendChild(clone);
  }
}

function updateLabelSize(width, height, columns = 1, shape = "rect", presetName = "custom") {
  const safeWidth = Math.max(30, Math.min(150, Number(width) || 100));
  const safeHeight = Math.max(20, Math.min(100, Number(height) || 50));
  const safeColumns = Math.max(1, Math.min(3, Number(columns) || 1));
  const cellWidth = safeWidth / safeColumns;
  const isCircle = shape === "circle";

  const barcodeWidth = Math.max(16, cellWidth - (isCircle ? 8 : 10));
  const barcodeHeight = Math.max(8, Math.min(safeHeight * (isCircle ? 0.34 : 0.48), safeHeight - 16));

  const padX = safeWidth <= 55 || isCircle ? 2.5 : 5;
  const padY = safeHeight <= 30 || isCircle ? 2 : 4;

  syncCopies(safeColumns);

  document.documentElement.style.setProperty("--label-width", `${safeWidth}mm`);
  document.documentElement.style.setProperty("--label-height", `${safeHeight}mm`);
  document.documentElement.style.setProperty("--barcode-width", `${barcodeWidth}mm`);
  document.documentElement.style.setProperty("--barcode-height", `${barcodeHeight}mm`);
  document.documentElement.style.setProperty("--label-pad-x", `${padX}mm`);
  document.documentElement.style.setProperty("--label-pad-y", `${padY}mm`);
  document.documentElement.style.setProperty("--label-radius", isCircle ? "50%" : "0");
  document.documentElement.style.setProperty("--label-repeat-columns", String(safeColumns));

  label.classList.toggle("circle-label", isCircle);
  label.classList.toggle("label-50x25", presetName === "50x25" || presetName === "50x25-2up");
}

function applySelectedLabelSize() {
  const preset = labelPresets[labelSize.value];

  if (preset) {
    labelWidth.value = preset.width;
    labelHeight.value = preset.height;
  }

  updateLabelSize(
    labelWidth.value,
    labelHeight.value,
    preset?.columns || 1,
    preset?.shape || "rect",
    labelSize.value
  );
}

function renderBarcode(record) {
  const currentHeight =
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--barcode-height")) || 24;

  const barcodeNodes = label.querySelectorAll("svg");

  barcodeNodes.forEach((node) => {
    JsBarcode(node, record.docketNo, {
      format: "CODE128",
      width: label.classList.contains("label-50x25")
        ? 1.35
        : label.classList.contains("circle-label")
          ? 1.2
          : 2,
      height: currentHeight * 3.78,
      margin: 0,
      displayValue: false
    });
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const record = getRecord();
  renderBarcode(record);

  try {
    await saveRecord(record);
    scanResult.textContent = "Saved: " + record.docketNo;
  } catch (error) {
    alert("Firebase me save nahi hua. Database rules check karo.");
  }

  form.reset();
  setTodayDate();
  setCurrentTime();
});

scanInput.addEventListener("keydown", async (event) => {
  if (event.key !== "Enter") return;

  const value = scanInput.value.trim();
  scanInput.value = "";
  scanResult.textContent = value || "No scan value";

  try {
    const record = await findRecord(value);

    if (record) {
      renderDetails(scanDetails, record);
    } else {
      scanDetails.innerHTML = `<div class="empty-state">Docket number Firebase me nahi mila.</div>`;
    }
  } catch (error) {
    scanDetails.innerHTML = `<div class="empty-state">Firebase se details read nahi ho paayi. Database rules check karo.</div>`;
  }

  scanInput.focus();
});

clearBtn.addEventListener("click", () => {
  label.querySelectorAll("svg").forEach((node) => {
    node.innerHTML = "";
  });

  scanResult.textContent = "No scan yet";
  scanDetails.innerHTML = "";
  scanInput.focus();
});

labelSize.addEventListener("change", applySelectedLabelSize);

labelWidth.addEventListener("input", () => {
  labelSize.value = "custom";
  updateLabelSize(labelWidth.value, labelHeight.value, 1, "rect", "custom");
});

labelHeight.addEventListener("input", () => {
  labelSize.value = "custom";
  updateLabelSize(labelWidth.value, labelHeight.value, 1, "rect", "custom");
});

setTodayDate();
setCurrentTime();
applySelectedLabelSize();
