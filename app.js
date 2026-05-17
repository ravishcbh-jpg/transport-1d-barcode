const form = document.getElementById("form");
const barcode = document.getElementById("barcode");
const scanInput = document.getElementById("scanInput");
const scanResult = document.getElementById("scanResult");
const labelRoute = document.getElementById("labelRoute");
const labelQty = document.getElementById("labelQty");
const clearBtn = document.getElementById("clearBtn");
const labelSize = document.getElementById("labelSize");
const labelWidth = document.getElementById("labelWidth");
const labelHeight = document.getElementById("labelHeight");
const label = document.getElementById("label");
const generatedDetails = document.getElementById("generatedDetails");
const scanDetails = document.getElementById("scanDetails");

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

const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbzAtbryJMLw_qqI1o-V-HEy8R2ujOMwFQpiCYE_jvTMlHY5MFZizxSN-ss2mYKgoz2F/exec";

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
  form.time.value = String(now.getHours()).padStart(2, "0") + ":" +
    String(now.getMinutes()).padStart(2, "0");
}

function getRecord() {
  return Object.fromEntries(new FormData(form).entries());
}

function getSavedRecords() {
  return JSON.parse(localStorage.getItem("transport1dRecords") || "{}");
}

function saveRecord(record) {
  const records = getSavedRecords();
  records[record.docketNo] = record;
  localStorage.setItem("transport1dRecords", JSON.stringify(records));
}

function findRecord(docketNo) {
  const records = getSavedRecords();
  return records[docketNo] || null;
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

function encodePayload(data) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

function jsonpRequest(params) {
  return new Promise((resolve, reject) => {
    if (!SHEET_API_URL) {
      reject(new Error("Sheet API URL missing"));
      return;
    }

    const callbackName = `sheetCallback_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const script = document.createElement("script");
    const url = new URL(SHEET_API_URL);

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    url.searchParams.set("callback", callbackName);

    window[callbackName] = (data) => {
      delete window[callbackName];
      script.remove();
      resolve(data);
    };

    script.onerror = () => {
      delete window[callbackName];
      script.remove();
      reject(new Error("Sheet request failed"));
    };

    script.src = url.toString();
    document.body.appendChild(script);
  });
}

async function saveRecordToSheet(record) {
  if (!SHEET_API_URL) return;
  await jsonpRequest({
    action: "save",
    docketNo: record.docketNo,
    payload: encodePayload(record)
  });
}

async function findRecordFromSheet(docketNo) {
  if (!SHEET_API_URL) return null;
  const response = await jsonpRequest({
    action: "get",
    docketNo
  });
  return response && response.ok ? response.record : null;
}

async function findRecordAnywhere(docketNo) {
  const localRecord = findRecord(docketNo);
  if (localRecord) return localRecord;

  try {
    return await findRecordFromSheet(docketNo);
  } catch (error) {
    return null;
  }
}

function syncCopies(columns) {
  const copy = label.querySelector(".label-copy");
  const currentCopies = label.querySelectorAll(".label-copy").length;

  if (columns === currentCopies) return;

  label.innerHTML = "";
  for (let index = 0; index < columns; index++) {
    const clone = copy.cloneNode(true);
    clone.querySelector("svg").id = index === 0 ? "barcode" : `barcode-${index + 1}`;
    clone.querySelector("[id^='labelRoute']").id = index === 0 ? "labelRoute" : `labelRoute-${index + 1}`;
    clone.querySelector("[id^='labelQty']").id = index === 0 ? "labelQty" : `labelQty-${index + 1}`;
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
  const currentHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--barcode-height")) || 24;
  const barcodeNodes = label.querySelectorAll("svg");

  barcodeNodes.forEach((node) => {
    JsBarcode(node, record.docketNo, {
      format: "CODE128",
      width: label.classList.contains("label-50x25") ? 1.35 : label.classList.contains("circle-label") ? 1.2 : 2,
      height: currentHeight * 3.78,
      margin: 0,
      displayValue: true,
      fontSize: label.classList.contains("label-50x25") ? 9 : label.classList.contains("circle-label") ? 10 : 16,
      textMargin: label.classList.contains("label-50x25") ? 1 : 4
    });
  });

  label.querySelectorAll(".label-title").forEach((node) => {
    node.textContent = record.transporter ? record.transporter.toUpperCase() : "TRANSPORT";
  });
  label.querySelectorAll("[id^='labelRoute']").forEach((node) => {
    node.textContent = record.docketNo || "-";
  });
  label.querySelectorAll("[id^='labelQty']").forEach((node) => {
    node.textContent = `QTY: ${record.quantity || "-"}`;
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const record = getRecord();
  renderBarcode(record);
  saveRecord(record);
  renderDetails(generatedDetails, record);

  try {
    await saveRecordToSheet(record);
  } catch (error) {
    generatedDetails.insertAdjacentHTML(
      "beforeend",
      `<div class="empty-state">Google Sheet me save nahi hua. Local browser me save ho gaya.</div>`
    );
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

  const record = await findRecordAnywhere(value);
  if (record) {
    renderDetails(scanDetails, record);
  } else {
    scanDetails.innerHTML = `<div class="empty-state">Is browser me is docket ki details saved nahi hain. 1D barcode sirf docket number scan karta hai; full details ke liye Google Sheet/database connect karna padega.</div>`;
  }

  scanInput.focus();
});

clearBtn.addEventListener("click", () => {
  barcode.innerHTML = "";
  label.querySelectorAll("svg").forEach((node) => {
    node.innerHTML = "";
  });
  label.querySelectorAll("[id^='labelRoute']").forEach((node) => {
    node.textContent = "- to -";
  });
  label.querySelectorAll("[id^='labelQty']").forEach((node) => {
    node.textContent = "Qty: -";
  });
  scanResult.textContent = "No scan yet";
  generatedDetails.innerHTML = `<div class="empty-state">Generate karne ke baad details yahan dikhegi.</div>`;
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
