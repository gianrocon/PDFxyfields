/**
 * PDFxyfields - Simulador A4 & Gerenciador de Coordenadas PDF (Bottom-Left Origin)
 * 
 * Padrão PDF (72 pt / inch):
 * - Origem (0,0): Canto inferior esquerdo da página
 * - A4: 595.28 pt (Largura) x 841.89 pt (Altura) [210mm x 297mm]
 */

// STATE MANAGEMENT
const STATE = {
  pdfName: "formulario_a4.pdf",
  pdfDoc: null,
  currentPage: 1,
  totalPages: 1,
  zoomScale: 1.0, // Scale factor relative to A4 pt dimensions (1.0 = 595.28px width)
  showGrid: true,
  
  // PDF Dimensions in Points (72 pt = 1 inch)
  pagePtWidth: 595.28,
  pagePtHeight: 841.89,
  
  // Selected coordinate point on canvas
  selectedCoords: null, // { x: pt, y: pt }
  
  // List of field objects
  fields: [],
  
  // Active selected field ID
  activeFieldId: null,

  // Memory for last selected/used font settings
  lastUsedFontFamily: 'Courier New',
  lastUsedFontSize: 12.0,
  lastUsedLetterSpacing: 0.0,

  // Lock X and Lock Y coordinates for next created fields
  lockedX: null,
  lockedY: null,

  // Available Monospaced Fonts
  monoFonts: [
    { name: 'Courier New', family: "'Courier New', Courier, monospace" },
    { name: 'Consolas', family: "'Consolas', monospace" },
    { name: 'Fira Code', family: "'Fira Code', monospace" },
    { name: 'Source Code Pro', family: "'Source Code Pro', monospace" },
    { name: 'Space Mono', family: "'Space Mono', monospace" }
  ]
};

// CONVERSION HELPERS (PDF POINTS <-> PIXELS <-> MM)
function ptToMm(pt) {
  return (pt * 25.4 / 72).toFixed(1);
}
function roundPt(val) {
  return Math.round(val * 10) / 10;
}
function parsePtValue(strVal) {
  if (strVal === undefined || strVal === null) return 0;
  const cleanStr = String(strVal).replace(',', '.').trim();
  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
}
function formatPtValue(num) {
  return (num || 0).toFixed(1).replace('.', ',');
}

// DOM ELEMENTS
const DOM = {
  // Header
  currentFileName: document.getElementById('current-file-name'),
  btnOpenPdf: document.getElementById('btn-open-pdf'),
  pdfFileInput: document.getElementById('pdf-file-input'),
  btnImportJson: document.getElementById('btn-import-json'),
  jsonFileInput: document.getElementById('json-file-input'),
  btnExportJson: document.getElementById('btn-export-json'),
  btnZoomIn: document.getElementById('btn-zoom-in'),
  btnZoomOut: document.getElementById('btn-zoom-out'),
  btnZoomFit: document.getElementById('btn-zoom-fit'),
  zoomLevel: document.getElementById('zoom-level'),
  toggleGrid: document.getElementById('toggle-grid'),
  
  // Left Sidebar
  liveX: document.getElementById('live-x'),
  liveY: document.getElementById('live-y'),
  liveXMm: document.getElementById('live-x-mm'),
  liveYMm: document.getElementById('live-y-mm'),
  selectedPointStatus: document.getElementById('selected-point-status'),
  selectedPointText: document.getElementById('selected-point-text'),
  fieldLabelInput: document.getElementById('field-label-input'),
  fieldLengthInput: document.getElementById('field-length-input'),
  btnCreateField: document.getElementById('btn-create-field'),
  pdfPageNum: document.getElementById('pdf-page-num'),
  pageNavControls: document.getElementById('page-nav-controls'),
  btnPrevPage: document.getElementById('btn-prev-page'),
  btnNextPage: document.getElementById('btn-next-page'),
  
  // Viewport & Page Canvas
  viewportContainer: document.getElementById('viewport-container'),
  a4PageWrapper: document.getElementById('a4-page-wrapper'),
  pdfCanvas: document.getElementById('pdf-canvas'),
  gridCanvas: document.getElementById('grid-canvas'),
  interactiveLayer: document.getElementById('interactive-layer'),
  clickPinMarker: document.getElementById('click-pin-marker'),
  pinCoordsText: document.getElementById('pin-coords-text'),
  
  // Right Sidebar
  fieldsCount: document.getElementById('fields-count'),
  btnShowAll: document.getElementById('btn-show-all'),
  btnHideAll: document.getElementById('btn-hide-all'),
  btnClearAll: document.getElementById('btn-clear-all'),
  fieldsList: document.getElementById('fields-list'),
  emptyFieldsMsg: document.getElementById('empty-fields-msg'),
  
  // Tools Panel
  activeFieldBadge: document.getElementById('active-field-badge'),
  noSelectionPlaceholder: document.getElementById('no-selection-placeholder'),
  toolsPanel: document.getElementById('tools-panel'),
  toolFieldLabel: document.getElementById('tool-field-label'),
  toolFieldLength: document.getElementById('tool-field-length'),
  btnLengthDec: document.getElementById('btn-length-dec'),
  btnLengthInc: document.getElementById('btn-length-inc'),
  toolSampleText: document.getElementById('tool-sample-text'),
  toolToggleSample: document.getElementById('tool-toggle-sample'),
  toolFontPreview: document.getElementById('tool-font-preview'),
  btnCycleFont: document.getElementById('btn-cycle-font'),
  toolFontSize: document.getElementById('tool-font-size'),
  btnFontDec: document.getElementById('btn-font-dec'),
  btnFontInc: document.getElementById('btn-font-inc'),
  toolLetterSpacing: document.getElementById('tool-letter-spacing'),
  btnSpacingDec: document.getElementById('btn-spacing-dec'),
  btnSpacingInc: document.getElementById('btn-spacing-inc'),
  totalLengthBadge: document.getElementById('total-length-badge'),
  
  // Group Inputs
  group1Input: document.getElementById('group-1-input'),
  group2Input: document.getElementById('group-2-input'),
  group3Input: document.getElementById('group-3-input'),
  group4Input: document.getElementById('group-4-input'),
  
  // Distance Inputs
  dist1Input: document.getElementById('dist-1-input'),
  dist2Input: document.getElementById('dist-2-input'),
  dist3Input: document.getElementById('dist-3-input'),
  
  // Nudge Values & Direct X, Y Inputs
  inputCoordX: document.getElementById('input-coord-x'),
  inputCoordY: document.getElementById('input-coord-y'),
  chkLockX: document.getElementById('chk-lock-x'),
  chkLockY: document.getElementById('chk-lock-y'),
  valNudgeX: document.getElementById('val-nudge-x'),
  valNudgeY: document.getElementById('val-nudge-y'),
  btnNudgeXDec10: document.getElementById('btn-nudge-x-dec-10'),
  btnNudgeXDec01: document.getElementById('btn-nudge-x-dec-01'),
  btnNudgeXInc01: document.getElementById('btn-nudge-x-inc-01'),
  btnNudgeXInc10: document.getElementById('btn-nudge-x-inc-10'),
  btnNudgeYDec10: document.getElementById('btn-nudge-y-dec-10'),
  btnNudgeYDec01: document.getElementById('btn-nudge-y-dec-01'),
  btnNudgeYInc01: document.getElementById('btn-nudge-y-inc-01'),
  btnNudgeYInc10: document.getElementById('btn-nudge-y-inc-10'),
  
  btnDeleteField: document.getElementById('btn-delete-field')
};

// INITIALIZATION
window.addEventListener('DOMContentLoaded', () => {
  initPdfJs();
  setupEventListeners();
  calculateZoomFit();
  renderGrid();
  loadLocalStorage();
  renderFields();
});

// PDF.JS CONFIGURATION
function initPdfJs() {
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
}

// CONVERSION HELPERS (PDF POINTS <-> PIXELS <-> MM)
function ptToMm(pt) {
  return (pt * 25.4 / 72).toFixed(1);
}
function roundPt(val) {
  return Math.round(val * 10) / 10;
}

// CALCULATE PDF COORDINATES (ORIGIN AT BOTTOM-LEFT)
function getPdfCoordsFromMouseEvent(e) {
  const rect = DOM.a4PageWrapper.getBoundingClientRect();
  const rawX = e.clientX - rect.left;
  const rawY = e.clientY - rect.top;
  
  // Convert screen pixels to PDF Points (72 pt/inch)
  // Scale maps 595.28 pt to current wrapper pixel width
  const scale = rect.width / STATE.pagePtWidth;
  
  const pdfX = Math.max(0, Math.min(STATE.pagePtWidth, rawX / scale));
  
  // PDF Y axis is inverted relative to HTML top-down coordinates:
  // Top of HTML is Y = pagePtHeight, Bottom of HTML is Y = 0
  const pdfY = Math.max(0, Math.min(STATE.pagePtHeight, STATE.pagePtHeight - (rawY / scale)));
  
  return {
    x: roundPt(pdfX),
    y: roundPt(pdfY),
    pixelX: rawX,
    pixelY: rawY
  };
}

// FONT MEMORY HELPER
function memorizeFieldFont(field) {
  if (!field) return;
  STATE.lastUsedFontFamily = field.fontFamily || 'Courier New';
  STATE.lastUsedFontSize = field.fontSize || 12.0;
  STATE.lastUsedLetterSpacing = field.letterSpacing || 0.0;
}

// SETUP EVENT LISTENERS
function setupEventListeners() {
  // Mouse movement over PDF page for live coordinate tracking
  DOM.interactiveLayer.addEventListener('mousemove', (e) => {
    const coords = getPdfCoordsFromMouseEvent(e);
    DOM.liveX.innerHTML = `${coords.x.toFixed(1)} <small>pt</small>`;
    DOM.liveY.innerHTML = `${coords.y.toFixed(1)} <small>pt</small>`;
    DOM.liveXMm.textContent = `${ptToMm(coords.x)} mm`;
    DOM.liveYMm.textContent = `${ptToMm(coords.y)} mm`;
  });

  // Click on PDF Page to select position
  DOM.interactiveLayer.addEventListener('click', (e) => {
    // Prevent click if dragging a field
    if (e.target.closest('.pdf-field-overlay')) return;
    
    let coords = getPdfCoordsFromMouseEvent(e);

    // Apply locked X and/or locked Y if active
    if (STATE.lockedX !== null && STATE.lockedX !== undefined) {
      coords.x = STATE.lockedX;
    }
    if (STATE.lockedY !== null && STATE.lockedY !== undefined) {
      coords.y = STATE.lockedY;
    }

    STATE.selectedCoords = { x: coords.x, y: coords.y };
    
    // Update Pin Marker
    const rect = DOM.a4PageWrapper.getBoundingClientRect();
    const scale = rect.width / STATE.pagePtWidth;
    const pinTop = (STATE.pagePtHeight - coords.y) * scale;
    const pinLeft = coords.x * scale;
    
    DOM.clickPinMarker.style.left = `${pinLeft}px`;
    DOM.clickPinMarker.style.top = `${pinTop}px`;
    DOM.clickPinMarker.style.display = 'block';
    
    const lockXLabel = STATE.lockedX !== null ? ' 🔒' : '';
    const lockYLabel = STATE.lockedY !== null ? ' 🔒' : '';
    DOM.pinCoordsText.textContent = `X: ${coords.x.toFixed(1)}${lockXLabel}, Y: ${coords.y.toFixed(1)}${lockYLabel}`;
    
    // Enable Create Button
    DOM.selectedPointStatus.style.background = (STATE.lockedX !== null || STATE.lockedY !== null) ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)';
    DOM.selectedPointStatus.style.color = (STATE.lockedX !== null || STATE.lockedY !== null) ? '#f59e0b' : '#10b981';
    DOM.selectedPointText.textContent = `X: ${coords.x.toFixed(1)} pt${lockXLabel}, Y: ${coords.y.toFixed(1)} pt${lockYLabel}`;
    DOM.btnCreateField.disabled = false;
    
    // Auto fill default label if empty
    if (!DOM.fieldLabelInput.value.trim()) {
      DOM.fieldLabelInput.value = `Campo_${STATE.fields.length + 1}`;
    }
  });

  // Create Field Button
  DOM.btnCreateField.addEventListener('click', () => {
    if (!STATE.selectedCoords) return;
    
    // Always check active selected field FIRST and memorize its font properties
    const activeField = getActiveField();
    if (activeField) {
      memorizeFieldFont(activeField);
    }
    
    const label = DOM.fieldLabelInput.value.trim() || `Campo_${STATE.fields.length + 1}`;
    const length = parseInt(DOM.fieldLengthInput.value, 10) || 10;
    
    const fontFamily = STATE.lastUsedFontFamily || 'Courier New';
    const fontSize = STATE.lastUsedFontSize || 12.0;
    const letterSpacing = STATE.lastUsedLetterSpacing || 0.0;

    const newField = {
      id: 'field_' + Date.now(),
      label: label,
      x: STATE.selectedCoords.x,
      y: STATE.selectedCoords.y,
      length: length,
      fontSize: fontSize,
      fontFamily: fontFamily,
      sampleText: label,
      showSampleText: false,
      letterSpacing: letterSpacing,
      rawGroups: [length, null, null, null],
      groups: [length, 0, 0, 0],
      groupDistances: [],
      height: fontSize,
      visible: true
    };
    
    STATE.fields.push(newField);
    STATE.activeFieldId = newField.id;
    
    // Clear inputs & update UI
    DOM.fieldLabelInput.value = '';
    saveLocalStorage();
    renderFields();
    updateToolsPanel();
  });

  // Show All / Hide All Buttons
  DOM.btnShowAll.addEventListener('click', () => {
    STATE.fields.forEach(f => f.visible = true);
    saveLocalStorage();
    renderFields();
  });
  DOM.btnHideAll.addEventListener('click', () => {
    STATE.fields.forEach(f => f.visible = false);
    saveLocalStorage();
    renderFields();
  });

  // Header Zoom Controls
  DOM.btnZoomIn.addEventListener('click', () => setZoom(STATE.zoomScale + 0.15));
  DOM.btnZoomOut.addEventListener('click', () => setZoom(STATE.zoomScale - 0.15));
  DOM.btnZoomFit.addEventListener('click', calculateZoomFit);

  // Toggle Grid
  DOM.toggleGrid.addEventListener('change', (e) => {
    STATE.showGrid = e.target.checked;
    DOM.gridCanvas.style.display = STATE.showGrid ? 'block' : 'none';
  });

  // PDF File Input
  DOM.btnOpenPdf.addEventListener('click', () => DOM.pdfFileInput.click());
  DOM.pdfFileInput.addEventListener('change', handlePdfFileUpload);

  // JSON Import & Export
  DOM.btnImportJson.addEventListener('click', () => DOM.jsonFileInput.click());
  DOM.jsonFileInput.addEventListener('change', handleJsonImport);
  DOM.btnExportJson.addEventListener('click', exportJsonSchema);

  // Clear All Fields
  DOM.btnClearAll.addEventListener('click', () => {
    if (STATE.fields.length === 0) return;
    if (confirm('Tem certeza que deseja remover todos os campos criados?')) {
      STATE.fields = [];
      STATE.activeFieldId = null;
      saveLocalStorage();
      renderFields();
      updateToolsPanel();
    }
  });

  // Page Navigation Controls
  DOM.btnPrevPage.addEventListener('click', () => {
    if (STATE.currentPage > 1) {
      STATE.currentPage--;
      renderPdfPage(STATE.currentPage);
    }
  });
  DOM.btnNextPage.addEventListener('click', () => {
    if (STATE.currentPage < STATE.totalPages) {
      STATE.currentPage++;
      renderPdfPage(STATE.currentPage);
    }
  });

  // Tools Panel Input Listeners
  setupToolsEventListeners();
}

// CHANGE FIELD LENGTH HELPER
function changeFieldLength(newLength) {
  const field = getActiveField();
  if (!field) return;

  const len = Math.max(1, Math.min(200, parseInt(newLength, 10) || 1));
  field.length = len;

  // Check if groups are default (uncustomized or only box 0 set)
  const isDefaultGroup = !field.rawGroups || field.rawGroups.every((v, i) => i === 0 ? true : (v === null || v === 0));

  if (isDefaultGroup) {
    field.rawGroups = [len, null, null, null];
    field.groups = [len, 0, 0, 0];
  } else {
    handleGroupInputChange(0);
  }

  if (DOM.toolFieldLength) DOM.toolFieldLength.value = field.length;
  if (DOM.totalLengthBadge) DOM.totalLengthBadge.textContent = `Total: ${field.length}`;
  groupInputsUpdateUI(field);
  saveLocalStorage();
  renderFields();
}

// TOOLS PANEL CONTROLS
function setupToolsEventListeners() {
  // Field Label (Name) Edit
  DOM.toolFieldLabel.addEventListener('input', (e) => {
    const field = getActiveField();
    if (!field) return;
    field.label = e.target.value;
    DOM.activeFieldBadge.textContent = field.label || 'Sem Nome';
    saveLocalStorage();
    renderFields();
  });

  // Field Length (Characters) Edit
  if (DOM.toolFieldLength) {
    DOM.toolFieldLength.addEventListener('input', (e) => {
      changeFieldLength(e.target.value);
    });
  }
  if (DOM.btnLengthInc) {
    DOM.btnLengthInc.addEventListener('click', () => {
      const field = getActiveField();
      if (!field) return;
      changeFieldLength(field.length + 1);
    });
  }
  if (DOM.btnLengthDec) {
    DOM.btnLengthDec.addEventListener('click', () => {
      const field = getActiveField();
      if (!field) return;
      changeFieldLength(field.length - 1);
    });
  }

  // Sample Text & Toggle
  DOM.toolSampleText.addEventListener('input', (e) => {
    const field = getActiveField();
    if (!field) return;
    field.sampleText = e.target.value;
    saveLocalStorage();
    renderFields();
  });

  DOM.toolToggleSample.addEventListener('change', (e) => {
    const field = getActiveField();
    if (!field) return;
    field.showSampleText = e.target.checked;
    saveLocalStorage();
    renderFields();
  });

  // Monospace Font Cycler
  DOM.btnCycleFont.addEventListener('click', () => {
    const field = getActiveField();
    if (!field) return;
    
    const currentIndex = STATE.monoFonts.findIndex(f => f.name === field.fontFamily);
    const nextIndex = (currentIndex + 1) % STATE.monoFonts.length;
    field.fontFamily = STATE.monoFonts[nextIndex].name;
    
    DOM.toolFontPreview.textContent = field.fontFamily;
    DOM.toolFontPreview.style.fontFamily = STATE.monoFonts[nextIndex].family;
    
    memorizeFieldFont(field);
    saveLocalStorage();
    renderFields();
  });

  // Font Size Stepper (+ / -)
  DOM.toolFontSize.addEventListener('input', (e) => {
    const field = getActiveField();
    if (!field) return;
    const val = parseFloat(e.target.value) || 12.0;
    field.fontSize = val;
    field.height = val; // Height matches font size 12 baseline standard
    memorizeFieldFont(field);
    saveLocalStorage();
    renderFields();
  });
  DOM.btnFontInc.addEventListener('click', () => {
    const field = getActiveField();
    if (!field) return;
    field.fontSize = roundPt(field.fontSize + 0.5);
    field.height = field.fontSize;
    DOM.toolFontSize.value = field.fontSize;
    memorizeFieldFont(field);
    saveLocalStorage();
    renderFields();
  });
  DOM.btnFontDec.addEventListener('click', () => {
    const field = getActiveField();
    if (!field) return;
    field.fontSize = Math.max(6, roundPt(field.fontSize - 0.5));
    field.height = field.fontSize;
    DOM.toolFontSize.value = field.fontSize;
    memorizeFieldFont(field);
    saveLocalStorage();
    renderFields();
  });

  // Letter Spacing (+0.1 / -0.1)
  DOM.toolLetterSpacing.addEventListener('input', (e) => {
    const field = getActiveField();
    if (!field) return;
    field.letterSpacing = parseFloat(e.target.value) || 0.0;
    memorizeFieldFont(field);
    saveLocalStorage();
    renderFields();
  });
  DOM.btnSpacingInc.addEventListener('click', () => {
    const field = getActiveField();
    if (!field) return;
    field.letterSpacing = roundPt(field.letterSpacing + 0.1);
    DOM.toolLetterSpacing.value = field.letterSpacing.toFixed(1);
    memorizeFieldFont(field);
    saveLocalStorage();
    renderFields();
  });
  DOM.btnSpacingDec.addEventListener('click', () => {
    const field = getActiveField();
    if (!field) return;
    field.letterSpacing = roundPt(field.letterSpacing - 0.1);
    DOM.toolLetterSpacing.value = field.letterSpacing.toFixed(1);
    memorizeFieldFont(field);
    saveLocalStorage();
    renderFields();
  });

  // Group Inputs (Smart Remainder Logic)
  const groupInputs = [DOM.group1Input, DOM.group2Input, DOM.group3Input, DOM.group4Input];
  groupInputs.forEach((input, index) => {
    input.addEventListener('input', () => {
      handleGroupInputChange(index);
    });
  });

  // Distance Inputs
  const distInputs = [DOM.dist1Input, DOM.dist2Input, DOM.dist3Input];
  distInputs.forEach((input, index) => {
    input.addEventListener('input', () => {
      const field = getActiveField();
      if (!field) return;
      
      const val = input.value === '' ? null : parseFloat(input.value);
      field.groupDistances[index] = val;
      saveLocalStorage();
      renderFields();
    });
  });

  // Direct X, Y Coordinate Text Inputs (Accepts comma or dot)
  if (DOM.inputCoordX) {
    DOM.inputCoordX.addEventListener('input', (e) => {
      const field = getActiveField();
      if (!field) return;
      const val = parsePtValue(e.target.value);
      field.x = Math.max(0, Math.min(STATE.pagePtWidth, roundPt(val)));
      saveLocalStorage();
      renderFields();
    });
  }

  if (DOM.inputCoordY) {
    DOM.inputCoordY.addEventListener('input', (e) => {
      const field = getActiveField();
      if (!field) return;
      const val = parsePtValue(e.target.value);
      field.y = Math.max(0, Math.min(STATE.pagePtHeight, roundPt(val)));
      saveLocalStorage();
      renderFields();
    });
  }

  // Lock X & Lock Y Checkboxes
  if (DOM.chkLockX) {
    DOM.chkLockX.addEventListener('change', (e) => {
      const field = getActiveField();
      if (!field) return;
      STATE.lockedX = e.target.checked ? field.x : null;
    });
  }

  if (DOM.chkLockY) {
    DOM.chkLockY.addEventListener('change', (e) => {
      const field = getActiveField();
      if (!field) return;
      STATE.lockedY = e.target.checked ? field.y : null;
    });
  }

  // Nudge Buttons X & Y
  DOM.btnNudgeXDec10.addEventListener('click', () => nudgeActiveField('x', -1.0));
  DOM.btnNudgeXDec01.addEventListener('click', () => nudgeActiveField('x', -0.1));
  DOM.btnNudgeXInc01.addEventListener('click', () => nudgeActiveField('x', 0.1));
  DOM.btnNudgeXInc10.addEventListener('click', () => nudgeActiveField('x', 1.0));

  DOM.btnNudgeYDec10.addEventListener('click', () => nudgeActiveField('y', -1.0));
  DOM.btnNudgeYDec01.addEventListener('click', () => nudgeActiveField('y', -0.1));
  DOM.btnNudgeYInc01.addEventListener('click', () => nudgeActiveField('y', 0.1));
  DOM.btnNudgeYInc10.addEventListener('click', () => nudgeActiveField('y', 1.0));

  // Delete Active Field
  DOM.btnDeleteField.addEventListener('click', () => {
    const field = getActiveField();
    if (!field) return;
    STATE.fields = STATE.fields.filter(f => f.id !== field.id);
    STATE.activeFieldId = null;
    saveLocalStorage();
    renderFields();
    updateToolsPanel();
  });
}

// HANDLE GROUP INPUT CHANGE WITH SMART AUTO REMAINDER & ZERO SUPPORT
function handleGroupInputChange(changedIndex) {
  const field = getActiveField();
  if (!field) return;

  const totalLen = field.length;
  const inputs = [DOM.group1Input, DOM.group2Input, DOM.group3Input, DOM.group4Input];
  
  // Read current input values (0 or positive integers)
  let vals = inputs.map(inp => {
    if (inp.value === '') return null;
    const p = parseInt(inp.value, 10);
    return isNaN(p) || p < 0 ? 0 : p;
  });

  // Clamp the changed index value between 0 and totalLen
  if (vals[changedIndex] !== null) {
    vals[changedIndex] = Math.min(totalLen, Math.max(0, vals[changedIndex]));
  }

  // Calculate sum of specified values (treating null as 0 for sum)
  let sum = vals.reduce((acc, v) => acc + (v || 0), 0);

  // If sum > totalLen: subtract excess from boxes to the right of changedIndex, then to the left
  if (sum > totalLen) {
    let excess = sum - totalLen;
    // First, reduce boxes to the right of changedIndex
    for (let i = 3; i > changedIndex && excess > 0; i--) {
      if (vals[i] !== null && vals[i] > 0) {
        const reduceBy = Math.min(vals[i], excess);
        vals[i] -= reduceBy;
        excess -= reduceBy;
      }
    }
    // Next, if excess remains, reduce boxes to the left of changedIndex
    for (let i = changedIndex - 1; i >= 0 && excess > 0; i--) {
      if (vals[i] !== null && vals[i] > 0) {
        const reduceBy = Math.min(vals[i], excess);
        vals[i] -= reduceBy;
        excess -= reduceBy;
      }
    }
    // If excess still remains, clamp changedIndex itself
    if (excess > 0 && vals[changedIndex] !== null) {
      vals[changedIndex] = Math.max(0, vals[changedIndex] - excess);
    }
  } 
  // If sum < totalLen: distribute remainder if there are unassigned (null) boxes
  else if (sum < totalLen) {
    const remainder = totalLen - sum;
    // Find the first null box after changedIndex
    let targetIdx = -1;
    for (let i = changedIndex + 1; i < 4; i++) {
      if (vals[i] === null) {
        targetIdx = i;
        break;
      }
    }
    if (targetIdx !== -1) {
      vals[targetIdx] = remainder;
    } else {
      // Find the last box that is not explicitly set to 0
      let lastActive = -1;
      for (let i = 3; i >= 0; i--) {
        if (vals[i] !== null && vals[i] > 0) {
          lastActive = i;
          break;
        }
      }
      if (lastActive !== -1) {
        vals[lastActive] += remainder;
      } else {
        // If all specified boxes are 0/null, place remainder in first box
        vals[0] = remainder;
      }
    }
  }

  // Save raw groups (preserving 0s) and non-zero active groups for rendering
  field.rawGroups = vals;
  field.groups = vals.map(v => v === null ? 0 : v);

  groupInputsUpdateUI(field);
  saveLocalStorage();
  renderFields();
}

function groupInputsUpdateUI(field) {
  const inputs = [DOM.group1Input, DOM.group2Input, DOM.group3Input, DOM.group4Input];
  let raw = field.rawGroups;

  if (!raw || raw.length === 0) {
    raw = [field.length, null, null, null];
    field.rawGroups = raw;
    field.groups = [field.length, 0, 0, 0];
  }

  for (let i = 0; i < 4; i++) {
    const val = raw[i];
    inputs[i].value = (val !== undefined && val !== null) ? val : '';
  }
}

// NUDGE FIELD COORDINATES
function nudgeActiveField(axis, delta) {
  const field = getActiveField();
  if (!field) return;

  if (axis === 'x') {
    field.x = Math.max(0, Math.min(STATE.pagePtWidth, roundPt(field.x + delta)));
  } else if (axis === 'y') {
    field.y = Math.max(0, Math.min(STATE.pagePtHeight, roundPt(field.y + delta)));
  }

  saveLocalStorage();
  renderFields();
  updateToolsPanelValuesOnly();
}

// GET ACTIVE FIELD OBJECT
function getActiveField() {
  return STATE.fields.find(f => f.id === STATE.activeFieldId) || null;
}

// SELECT A FIELD WITHOUT TEARING DOWN OVERLAY DOM (avoids breaking in-flight drags
// and keeps the just-clicked box's DOM node alive instead of orphaning it)
function setActiveField(fieldId) {
  const previousId = STATE.activeFieldId;
  if (previousId === fieldId) {
    updateToolsPanel();
    return;
  }

  const previousField = STATE.fields.find(f => f.id === previousId);
  const overlayExists = fieldId && !!DOM.interactiveLayer.querySelector(`.pdf-field-overlay[data-id="${fieldId}"]`);
  const needsFullRerender = (fieldId && !overlayExists) || (previousField && previousField.visible === false);

  STATE.activeFieldId = fieldId;

  if (needsFullRerender) {
    renderFields();
  } else {
    DOM.interactiveLayer.querySelectorAll('.pdf-field-overlay').forEach(el => {
      el.classList.toggle('selected', el.getAttribute('data-id') === fieldId);
    });
    DOM.fieldsList.querySelectorAll('.field-list-item').forEach(el => {
      el.classList.toggle('selected', el.getAttribute('data-id') === fieldId);
    });
  }

  updateToolsPanel();
}

// RENDER ALL CREATED FIELDS ON PAGE & LIST
function renderFields() {
  // Update Fields List in Right Sidebar
  DOM.fieldsCount.textContent = STATE.fields.length;
  DOM.fieldsList.innerHTML = '';

  if (STATE.fields.length === 0) {
    DOM.emptyFieldsMsg.style.display = 'block';
    DOM.fieldsList.appendChild(DOM.emptyFieldsMsg);
  } else {
    DOM.emptyFieldsMsg.style.display = 'none';

    STATE.fields.forEach(field => {
      const item = document.createElement('div');
      item.className = `field-list-item ${field.id === STATE.activeFieldId ? 'selected' : ''}`;
      item.setAttribute('data-id', field.id);

      item.innerHTML = `
        <label class="field-item-checkbox" title="Exibir/ocultar no PDF">
          <input type="checkbox" class="chk-field-visibility" ${field.visible !== false ? 'checked' : ''}>
        </label>
        <div class="field-item-info">
          <span class="field-item-prefix">[X: ${field.x.toFixed(1)}, Y: ${field.y.toFixed(1)}, L: ${field.length}]</span>
          <span class="field-item-name">${escapeHtml(field.label)}</span>
        </div>
        <button class="field-item-del" title="Excluir campo">✕</button>
      `;

      const chk = item.querySelector('.chk-field-visibility');
      chk.addEventListener('click', (e) => e.stopPropagation());
      chk.addEventListener('change', (e) => {
        field.visible = e.target.checked;
        saveLocalStorage();
        renderFields();
      });

      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('field-item-del')) {
          e.stopPropagation();
          STATE.fields = STATE.fields.filter(f => f.id !== field.id);
          if (STATE.activeFieldId === field.id) STATE.activeFieldId = null;
          saveLocalStorage();
          renderFields();
          updateToolsPanel();
        } else if (!e.target.classList.contains('chk-field-visibility')) {
          setActiveField(field.id);
        }
      });

      DOM.fieldsList.appendChild(item);
    });
  }

  // Render Overlays on Interactive PDF Layer
  // Clear old field elements (keep clickPinMarker)
  const existingOverlays = DOM.interactiveLayer.querySelectorAll('.pdf-field-overlay');
  existingOverlays.forEach(el => el.remove());

  const rect = DOM.a4PageWrapper.getBoundingClientRect();
  const scale = rect.width / STATE.pagePtWidth;

  STATE.fields.forEach(field => {
    // Show overlay if field is visible OR if field is currently selected/active!
    const isVisible = (field.visible !== false) || (field.id === STATE.activeFieldId);
    if (isVisible) {
      const overlay = createFieldOverlayElement(field, scale);
      DOM.interactiveLayer.appendChild(overlay);
    }
  });
}

// CALCULATE FIELD WIDTH & RENDER OVERLAY
function calculateFieldDimensions(field) {
  // Font Size (pt)
  const fontSize = field.fontSize || 12.0;
  const fontObj = STATE.monoFonts.find(f => f.name === field.fontFamily) || STATE.monoFonts[0];
  
  // Standard character width in monospace font is approx 0.6 * fontSize
  const charWidthPt = fontSize * 0.6;
  const letterSpacingPt = field.letterSpacing || 0.0;

  // Resolve Groups (filtering 0s for visual rendering)
  let rawG = field.groups || field.rawGroups || [];
  let groups = rawG.filter(g => g !== null && g !== undefined && g > 0);
  if (groups.length === 0) {
    groups = [field.length];
  }
  
  // Resolve Distances
  let distances = [];
  for (let i = 0; i < groups.length - 1; i++) {
    if (field.groupDistances && field.groupDistances[i] !== undefined && field.groupDistances[i] !== null) {
      distances[i] = field.groupDistances[i];
    } else {
      // Default: (chars in previous group) * 4 pt
      distances[i] = (groups[i] || 1) * 4.0;
    }
  }

  // Calculate Total Width (pt)
  let totalWidthPt = 0;
  groups.forEach((count, gIndex) => {
    // Width of characters in this group
    const groupCharWidth = (count * charWidthPt) + (Math.max(0, count - 1) * letterSpacingPt);
    totalWidthPt += groupCharWidth;
    
    // Add distance to next group
    if (gIndex < groups.length - 1) {
      totalWidthPt += (distances[gIndex] || 8.0);
    }
  });

  const heightPt = field.height || fontSize;

  return {
    widthPt: roundPt(totalWidthPt),
    heightPt: roundPt(heightPt),
    groups: groups,
    distances: distances,
    fontObj: fontObj,
    charWidthPt: charWidthPt
  };
}

// CREATE OVERLAY DOM ELEMENT ON PDF CANVAS
function createFieldOverlayElement(field, scale) {
  const dims = calculateFieldDimensions(field);
  
  const overlay = document.createElement('div');
  overlay.className = `pdf-field-overlay ${field.id === STATE.activeFieldId ? 'selected' : ''}`;
  overlay.setAttribute('data-id', field.id);

  // Position relative to PDF page container:
  // CSS Left = field.x * scale
  // CSS Top = (pagePtHeight - field.y - heightPt) * scale (Since Y in PDF is bottom/baseline!)
  const leftPx = field.x * scale;
  const topPx = (STATE.pagePtHeight - field.y - dims.heightPt) * scale;
  const widthPx = dims.widthPt * scale;
  const heightPx = dims.heightPt * scale;

  overlay.style.left = `${leftPx}px`;
  overlay.style.top = `${topPx}px`;
  overlay.style.width = `${widthPx}px`;
  overlay.style.height = `${heightPx}px`;

  // Label tag at top-right of rectangle
  const labelTag = document.createElement('div');
  labelTag.className = 'field-label-tag';
  labelTag.textContent = field.label;
  overlay.appendChild(labelTag);

  // Sample String rendering or Rectangle display
  if (field.showSampleText && field.sampleText) {
    const textRender = document.createElement('div');
    textRender.className = 'sample-text-render';
    textRender.style.fontFamily = dims.fontObj.family;
    textRender.style.fontSize = `${field.fontSize * scale}px`;
    textRender.style.letterSpacing = `${(field.letterSpacing || 0) * scale}px`;

    // Render text according to groups & distances
    let textToRender = field.sampleText;
    if (textToRender.length < field.length) {
      textToRender = textToRender.padEnd(field.length, ' ');
    }

    let charOffset = 0;
    let formattedHTML = '';

    dims.groups.forEach((count, gIdx) => {
      const segment = textToRender.substring(charOffset, charOffset + count);
      charOffset += count;

      const gapPx = gIdx < dims.distances.length ? (dims.distances[gIdx] * scale) : 0;
      formattedHTML += `<span style="display:inline-block; margin-right:${gapPx}px;">${escapeHtml(segment)}</span>`;
    });

    textRender.innerHTML = formattedHTML;
    overlay.appendChild(textRender);
  }

  // Click & Drag Events
  overlay.addEventListener('click', (e) => {
    e.stopPropagation();
    setActiveField(field.id);
  });

  makeElementDraggable(overlay, field, scale);

  return overlay;
}

// DRAG AND DROP ENGINE FOR PDF OVERLAY FIELDS
function makeElementDraggable(element, field, scale) {
  let isDragging = false;
  let startX, startY;
  let initialLeft, initialTop;

  element.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // Only left click
    e.preventDefault();
    e.stopPropagation();

    isDragging = true;
    setActiveField(field.id);

    startX = e.clientX;
    startY = e.clientY;
    initialLeft = parseFloat(element.style.left) || 0;
    initialTop = parseFloat(element.style.top) || 0;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  function onMouseMove(e) {
    if (!isDragging) return;
    
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    const newLeftPx = initialLeft + dx;
    const newTopPx = initialTop + dy;

    element.style.left = `${newLeftPx}px`;
    element.style.top = `${newTopPx}px`;

    // Update real-time PDF X, Y values in Nudge panel
    const dims = calculateFieldDimensions(field);
    const pdfX = Math.max(0, Math.min(STATE.pagePtWidth - dims.widthPt, newLeftPx / scale));
    const pdfY = Math.max(0, Math.min(STATE.pagePtHeight - dims.heightPt, STATE.pagePtHeight - (newTopPx / scale) - dims.heightPt));

    field.x = roundPt(pdfX);
    field.y = roundPt(pdfY);

    if (DOM.inputCoordX && document.activeElement !== DOM.inputCoordX) {
      DOM.inputCoordX.value = formatPtValue(field.x);
    }
    if (DOM.inputCoordY && document.activeElement !== DOM.inputCoordY) {
      DOM.inputCoordY.value = formatPtValue(field.y);
    }
  }

  function onMouseUp() {
    if (!isDragging) return;
    isDragging = false;
    
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);

    saveLocalStorage();
    renderFields();
    updateToolsPanelValuesOnly();
  }
}

// UPDATE TOOLS PANEL ACCORDING TO SELECTED FIELD
function updateToolsPanel() {
  const field = getActiveField();

  if (!field) {
    DOM.activeFieldBadge.textContent = 'Nenhum Selecionado';
    DOM.noSelectionPlaceholder.style.display = 'block';
    DOM.toolsPanel.style.display = 'none';
    return;
  }

  DOM.activeFieldBadge.textContent = field.label;
  DOM.noSelectionPlaceholder.style.display = 'none';
  DOM.toolsPanel.style.display = 'flex';

  memorizeFieldFont(field);

  DOM.toolFieldLabel.value = field.label || '';
  if (DOM.toolFieldLength) DOM.toolFieldLength.value = field.length || 10;
  DOM.toolSampleText.value = field.sampleText || '';
  DOM.toolToggleSample.checked = !!field.showSampleText;

  // Font
  const fontObj = STATE.monoFonts.find(f => f.name === field.fontFamily) || STATE.monoFonts[0];
  DOM.toolFontPreview.textContent = fontObj.name;
  DOM.toolFontPreview.style.fontFamily = fontObj.family;

  // Font Size & Letter Spacing
  DOM.toolFontSize.value = field.fontSize || 12.0;
  DOM.toolLetterSpacing.value = (field.letterSpacing || 0.0).toFixed(1);

  // Total length
  DOM.totalLengthBadge.textContent = `Total: ${field.length}`;

  // Group Inputs
  groupInputsUpdateUI(field);

  // Distance Inputs
  const dists = field.groupDistances || [];
  DOM.dist1Input.value = (dists[0] !== undefined && dists[0] !== null) ? dists[0] : '';
  DOM.dist2Input.value = (dists[1] !== undefined && dists[1] !== null) ? dists[1] : '';
  DOM.dist3Input.value = (dists[2] !== undefined && dists[2] !== null) ? dists[2] : '';

  // Nudge & Direct Coordinate Values
  if (DOM.valNudgeX) DOM.valNudgeX.textContent = `${field.x.toFixed(1)} pt`;
  if (DOM.valNudgeY) DOM.valNudgeY.textContent = `${field.y.toFixed(1)} pt`;
  if (DOM.inputCoordX && document.activeElement !== DOM.inputCoordX) {
    DOM.inputCoordX.value = formatPtValue(field.x);
  }
  if (DOM.inputCoordY && document.activeElement !== DOM.inputCoordY) {
    DOM.inputCoordY.value = formatPtValue(field.y);
  }

  // Lock Checkboxes state sync
  if (DOM.chkLockX) DOM.chkLockX.checked = (STATE.lockedX !== null && Math.abs(field.x - STATE.lockedX) < 0.01);
  if (DOM.chkLockY) DOM.chkLockY.checked = (STATE.lockedY !== null && Math.abs(field.y - STATE.lockedY) < 0.01);
}

function updateToolsPanelValuesOnly() {
  const field = getActiveField();
  if (!field) return;
  if (DOM.valNudgeX) DOM.valNudgeX.textContent = `${field.x.toFixed(1)} pt`;
  if (DOM.valNudgeY) DOM.valNudgeY.textContent = `${field.y.toFixed(1)} pt`;
  if (DOM.inputCoordX && document.activeElement !== DOM.inputCoordX) {
    DOM.inputCoordX.value = formatPtValue(field.x);
  }
  if (DOM.inputCoordY && document.activeElement !== DOM.inputCoordY) {
    DOM.inputCoordY.value = formatPtValue(field.y);
  }
  if (DOM.chkLockX && DOM.chkLockX.checked) STATE.lockedX = field.x;
  if (DOM.chkLockY && DOM.chkLockY.checked) STATE.lockedY = field.y;
}

// ZOOM ENGINE
function setZoom(newScale) {
  STATE.zoomScale = Math.max(0.4, Math.min(2.5, newScale));
  DOM.zoomLevel.textContent = `${Math.round(STATE.zoomScale * 100)}%`;

  // Scale A4 Wrapper
  const targetPxWidth = STATE.pagePtWidth * STATE.zoomScale;
  const targetPxHeight = STATE.pagePtHeight * STATE.zoomScale;

  DOM.a4PageWrapper.style.width = `${targetPxWidth}px`;
  DOM.a4PageWrapper.style.height = `${targetPxHeight}px`;

  renderGrid();
  if (STATE.pdfDoc) {
    renderPdfPage(STATE.currentPage);
  }
  renderFields();
}

function calculateZoomFit() {
  const paddingX = 60;
  const paddingY = 60;
  const availWidth = Math.max(200, DOM.viewportContainer.clientWidth - paddingX);
  const availHeight = Math.max(200, DOM.viewportContainer.clientHeight - paddingY);

  const scaleX = availWidth / STATE.pagePtWidth;
  const scaleY = availHeight / STATE.pagePtHeight;

  // Fit both width and height so the entire page fits on screen cleanly!
  const fitScale = Math.min(scaleX, scaleY);
  setZoom(fitScale);

  DOM.viewportContainer.scrollTop = 0;
  DOM.viewportContainer.scrollLeft = 0;
}

// GRID CANVAS RENDERER (PDF POINT GRID)
function renderGrid() {
  const canvas = DOM.gridCanvas;
  const ctx = canvas.getContext('2d');
  
  const rect = DOM.a4PageWrapper.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!STATE.showGrid) return;

  const scale = rect.width / STATE.pagePtWidth;
  const stepPt = 50; // Grid line every 50 PDF points
  const stepPx = stepPt * scale;

  ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)';
  ctx.lineWidth = 1;
  ctx.font = `${Math.max(9, 10 * scale)}px sans-serif`;
  ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';

  // Vertical Lines (X Axis)
  for (let xPt = 0; xPt <= STATE.pagePtWidth; xPt += stepPt) {
    const xPx = xPt * scale;
    ctx.beginPath();
    ctx.moveTo(xPx, 0);
    ctx.lineTo(xPx, canvas.height);
    ctx.stroke();

    if (xPt > 0 && xPt < STATE.pagePtWidth) {
      ctx.fillText(`${xPt}`, xPx + 2, canvas.height - 4);
    }
  }

  // Horizontal Lines (Y Axis - Inverted)
  for (let yPt = 0; yPt <= STATE.pagePtHeight; yPt += stepPt) {
    const yPx = canvas.height - (yPt * scale);
    ctx.beginPath();
    ctx.moveTo(0, yPx);
    ctx.lineTo(canvas.width, yPx);
    ctx.stroke();

    if (yPt > 0 && yPt < STATE.pagePtHeight) {
      ctx.fillText(`${yPt}`, 4, yPx - 2);
    }
  }
}

// PDF RENDERER (PDF.JS)
function handlePdfFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  STATE.pdfName = file.name;
  DOM.currentFileName.textContent = file.name;

  // 1. Read Base64 representation for saving to /maps/
  const b64Reader = new FileReader();
  b64Reader.onload = function(evt) {
    STATE.pdfBase64 = evt.target.result;
  };
  b64Reader.readAsDataURL(file);

  // 2. Read ArrayBuffer for PDF.js canvas rendering
  const abReader = new FileReader();
  abReader.onload = function(evt) {
    const typedarray = new Uint8Array(evt.target.result);
    pdfjsLib.getDocument(typedarray).promise.then(pdf => {
      STATE.pdfDoc = pdf;
      STATE.totalPages = pdf.numPages;
      STATE.currentPage = 1;

      DOM.pdfPageNum.textContent = `1 / ${pdf.numPages}`;
      DOM.pageNavControls.style.display = pdf.numPages > 1 ? 'flex' : 'none';

      renderPdfPage(1);

      // Auto-load paired JSON if stored in localStorage
      loadLocalStorage();
      renderFields();
    });
  };
  abReader.readAsArrayBuffer(file);
}

function renderPdfPage(pageNum) {
  if (!STATE.pdfDoc) return;

  STATE.pdfDoc.getPage(pageNum).then(page => {
    const canvas = DOM.pdfCanvas;
    const ctx = canvas.getContext('2d');

    const rect = DOM.a4PageWrapper.getBoundingClientRect();
    const viewport = page.getViewport({ scale: rect.width / page.getViewport({ scale: 1.0 }).width });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };
    page.render(renderContext);
  });
}

// JSON IMPORT & EXPORT
function exportJsonSchema() {
  const jsonOutput = {
    pdfName: STATE.pdfName,
    pageSize: {
      widthPt: STATE.pagePtWidth,
      heightPt: STATE.pagePtHeight,
      unit: "pt"
    },
    fields: STATE.fields.map(f => {
      const dims = calculateFieldDimensions(f);
      return {
        id: f.id,
        label: f.label,
        x: f.x,
        y: f.y,
        length: f.length,
        fontSize: f.fontSize,
        fontFamily: f.fontFamily,
        charWidthPt: dims.charWidthPt,
        letterSpacingPt: f.letterSpacing || 0.0,
        rawGroups: f.rawGroups || f.groups || [f.length],
        groups: dims.groups,
        groupDistancesPt: dims.distances,
        heightPt: dims.heightPt,
        widthPt: dims.widthPt,
        sampleText: f.sampleText || f.label,
        showSampleText: !!f.showSampleText,
        visible: f.visible !== false
      };
    })
  };

  const payload = {
    pdfName: STATE.pdfName,
    jsonContent: jsonOutput,
    pdfBase64: STATE.pdfBase64 || null
  };

  // POST to server to save directly into maps/ subfolder
  fetch('/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      alert(`✅ Sucesso!\nArquivos salvos na pasta maps/:\n- ${data.jsonFile}${data.pdfFile ? '\n- ' + data.pdfFile : ''}`);
    } else {
      triggerBrowserDownload(jsonOutput);
    }
  })
  .catch(err => {
    console.warn('Servidor offline, baixando via navegador...', err);
    triggerBrowserDownload(jsonOutput);
  });
}

function triggerBrowserDownload(jsonOutput) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jsonOutput, null, 2));
  const downloadAnchor = document.createElement('a');
  const jsonName = STATE.pdfName.replace(/\.pdf$/i, '') + '.json';
  
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", jsonName);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function handleJsonImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = JSON.parse(evt.target.result);
      if (data.fields && Array.isArray(data.fields)) {
        STATE.fields = data.fields.map(f => ({
          id: f.id || 'field_' + Date.now(),
          label: f.label || 'Campo',
          x: f.x || 0,
          y: f.y || 0,
          length: f.length || 10,
          fontSize: f.fontSize || 12.0,
          fontFamily: f.fontFamily || 'Courier New',
          sampleText: f.sampleText || f.label,
          showSampleText: !!f.showSampleText,
          letterSpacing: f.letterSpacingPt !== undefined ? f.letterSpacingPt : (f.letterSpacing || 0.0),
          rawGroups: f.rawGroups || f.groups || [f.length],
          groups: f.groups || [f.length],
          groupDistances: f.groupDistancesPt !== undefined ? f.groupDistancesPt : (f.groupDistances || []),
          height: f.heightPt || f.fontSize || 12.0,
          visible: f.visible !== undefined ? f.visible : true
        }));

        STATE.activeFieldId = STATE.fields.length > 0 ? STATE.fields[0].id : null;
        saveLocalStorage();
        renderFields();
        updateToolsPanel();
        alert(`Sucesso: ${STATE.fields.length} campos carregados do JSON!`);
      }
    } catch (err) {
      alert('Erro ao ler o arquivo JSON: formato inválido.');
    }
  };
  reader.readAsText(file);
}

// LOCALSTORAGE PERSISTENCE
function saveLocalStorage() {
  const key = `pdfxyfields_${STATE.pdfName}`;
  localStorage.setItem(key, JSON.stringify(STATE.fields));
}

function loadLocalStorage() {
  const key = `pdfxyfields_${STATE.pdfName}`;
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      STATE.fields = JSON.parse(saved);
    } catch (e) {}
  }
}

// UTILITY HELPERS
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
