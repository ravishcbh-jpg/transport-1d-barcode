const form = document.getElementById("form");
const barcode = document.getElementById("barcode");
const scanInput = document.getElementById("scanInput");
const scanResult = document.getElementById("scanResult");
const clearBtn = document.getElementById("clearBtn");
const labelSize = document.getElementById("labelSize");
const labelWidth = document.getElementById("labelWidth");
const labelHeight = document.getElementById("labelHeight");
const label = document.getElementById("label");

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

function syncCopies(columns) {
  const firstCopy = label.querySelector(".label-copy");
  const currentCopies = label.querySelectorAll(".label-copy").length;

  if (columns === currentCopies) return;

  label.innerHTML = "";

  for (let index = 0; index < columns; index++) {
    const clone = firstCopy.cloneNode(true);
    clone.querySelector("svg").id = index === 0 ? "barcode" : `barcode-${index + 1}`;
    clone.querySelector("[id^='labelRoute']").id = index === 0 ? "labelRoute" : `labelRoute-${index + 1}`;
    clone.querySelector("[id^='labelQty']").id = index === 0 ? "labelQty" : `labelQty-${index + 1}`;
    label.appendChild(clone);
  }
}

function updateLabelSize(width, height, columns = 1, shape = "rect") {
  const safeWidth = Math.max(30, Math.min(150, Number(width) || 100));
  const safeHeight = Math.max(20, Math.min(100, Number(height) || 50));
  const safeColumns = Math.max(1, Math.min(3, Number(columns) || 1));
  const cellWidth = safeWidth / safeColumns;
  const isCircle = shape === "circle";

  const barcodeWidth = Math.max(16, cellWidth - (isCircle ? 8 : 10));
  const barcodeHeight = Math.max(
    8,
    Math.min(safeHeight * (isCircle ? 0.34 : 0.48), safeHeight - 16)
  );

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
    preset?.shape || "rect"
  );
}

function renderBarcode(record) {
  const currentHeight =
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--barcode-height")) || 24;

  const barcodeNodes = label.querySelectorAll("svg");

  barcodeNodes.forEach((node) => {
    JsBarcode(node, record.docketNo, {
      format: "CODE128",
      width: label.classList.contains("circle-label") ? 1.2 : 2,
      height: currentHeight * 3.78,
      margin: 0,
      displayValue: true,
      fontSize: label.classList.contains("circle-label") ? 10 : 16,
      textMargin: 4
    });
  });

  label.querySelectorAll("[id^='labelRoute']").forEach((node) => {
    node.textContent = `${record.fromPlace || "-"} to ${record.toPlace || "-"}`;
  });

  label.querySelectorAll("[id^='labelQty']").forEach((node) => {
    node.textContent = `Qty: ${record.quantity || "-"}`;
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const record = getRecord();
  renderBarcode(record);

  form.reset();
  setTodayDate();
  setCurrentTime();
});

scanInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;

  const value = scanInput.value.trim();
  scanInput.value = "";

  scanResult.textContent = value || "No scan value";
  scanInput.focus();
});

clearBtn.addEventListener("click", () => {
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
  scanInput.focus();
});

labelSize.addEventListener("change", applySelectedLabelSize);

labelWidth.addEventListener("input", () => {
  labelSize.value = "custom";
  updateLabelSize(labelWidth.value, labelHeight.value, 1, "rect");
});

labelHeight.addEventListener("input", () => {
  labelSize.value = "custom";
  updateLabelSize(labelWidth.value, labelHeight.value, 1, "rect");
});

setTodayDate();
setCurrentTime();
applySelectedLabelSize();
