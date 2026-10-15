/* Safe Start PDF Learning Library

   PDF rendering uses PDF.js (loaded from CDN). Uploads are kept in browser memory only. */

if (window.pdfjsLib) {

  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

}

const uploadInput = document.getElementById('pdfUpload');

const grid = document.getElementById('documentGrid');

const searchInput = document.getElementById('searchDocs');

const emptyState = document.getElementById('emptyState');

const cards = [...document.querySelectorAll('.doc-card')];

const modal = document.getElementById('readerModal');

const readerContent = document.getElementById('readerContent');

const readerTitle = document.getElementById('readerTitle');

const readerStatus = document.getElementById('readerStatus');

const pageNumberInput = document.getElementById('pageNumber');

const pageTotal = document.getElementById('pageTotal');

const prevBtn = document.getElementById('prevPage');

const nextBtn = document.getElementById('nextPage');

const zoomInBtn = document.getElementById('zoomIn');

const zoomOutBtn = document.getElementById('zoomOut');

const zoomLabel = document.getElementById('zoomLabel');

const downloadBtn = document.getElementById('downloadBtn');

let activeFilter = 'all', pdfDoc = null, currentPage = 1, scale = 1, currentUrl = null, currentFilename = 'document.pdf', renderTask = null, toastTimer = null;



function toast(message) {

  const el = document.getElementById('toast');

  el.textContent = message; el.classList.add('show');

  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3200);

}

function refreshCount() {

  const count = document.querySelectorAll('.doc-card:not([hidden])').length;

  document.getElementById('docCount').textContent = String(count).padStart(2,'0');

  document.getElementById('allCount').textContent = count;

}

function filterCards() {

  const q = searchInput.value.trim().toLowerCase();

  let shown = 0;

  document.querySelectorAll('.doc-card').forEach(card => {

    const matchesFilter = activeFilter === 'all' || card.dataset.category === activeFilter;

    const matchesSearch = (card.dataset.title || '').toLowerCase().includes(q) || card.textContent.toLowerCase().includes(q);

    card.hidden = !(matchesFilter && matchesSearch);

    if (!card.hidden) shown++;

  });

  emptyState.hidden = shown !== 0;

  refreshCount();

}

searchInput.addEventListener('input', filterCards);

document.querySelectorAll('.category').forEach(btn => btn.addEventListener('click', () => {

  document.querySelectorAll('.category').forEach(b => b.classList.remove('active'));

  btn.classList.add('active'); activeFilter = btn.dataset.filter; filterCards();

}));

document.querySelectorAll('[data-upload="true"]').forEach(btn => btn.addEventListener('click', () => uploadInput.click()));

document.querySelectorAll('.open-doc[data-url]').forEach(btn => btn.addEventListener('click', () => {

  toast('For the official handbook, download the PDF from NTSA or upload the copy provided by your instructor.');

  window.open(btn.dataset.url, '_blank', 'noopener');

}));

function openModal() { modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }

function closeModal() { modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); document.body.style.overflow=''; }

document.getElementById('closeReader').addEventListener('click', closeModal);

modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });

document.getElementById('fullscreenBtn').addEventListener('click', async () => {

  try { if (!document.fullscreenElement) await document.querySelector('.reader-shell').requestFullscreen(); else await document.exitFullscreen(); }

  catch (_) { toast('Full screen is not available in this browser.'); }

});

uploadInput.addEventListener('change', async e => {

  const files = [...e.target.files].filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));

  if (!files.length) return;

  for (const file of files) {

    const url = URL.createObjectURL(file);

    addUploadedCard(file, url);

  }

  filterCards();

  if (files.length === 1) await loadPdf(URL.createObjectURL(files[0]), files[0].name, files[0]);

  else toast(`${files.length} PDF documents added to your library.`);

  uploadInput.value = '';

});

function addUploadedCard(file, url) {

  const card = document.createElement('article');

  card.className = 'doc-card'; card.dataset.category = 'practice'; card.dataset.title = file.name;

  card.innerHTML = `<div class="doc-cover cover-green"><span class="cover-label">YOUR DOCUMENT</span><div class="cover-title">SAFE START<br><strong>${escapeHtml(file.name.length > 22 ? file.name.slice(0,19)+'…' : file.name)}</strong></div><div class="cover-road"></div><span class="pdf-chip">UPLOADED PDF</span></div><div class="doc-info"><div class="doc-meta"><span class="tag tag-green">YOUR FILE</span><span class="file-type">PDF</span></div><h3>${escapeHtml(file.name)}</h3><p>${formatBytes(file.size)} · Available in this browser session.</p><div class="doc-actions"><button class="open-doc">Open document <span>↗</span></button><button class="icon-btn remove-doc" title="Remove document">×</button></div></div>`;

  card.querySelector('.open-doc').addEventListener('click', () => loadPdf(url, file.name, file));

  card.querySelector('.remove-doc').addEventListener('click', () => { card.remove(); URL.revokeObjectURL(url); filterCards(); toast('Document removed from the library.'); });

  grid.prepend(card);

}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function formatBytes(bytes) { if (bytes < 1024) return bytes + ' B'; if (bytes < 1048576) return (bytes/1024).toFixed(1)+' KB'; return (bytes/1048576).toFixed(1)+' MB'; }

async function loadPdf(url, filename, fileObject = null) {

  if (!window.pdfjsLib) { toast('PDF reader could not load. Check your internet connection and reload the page.'); return; }

  openModal(); readerTitle.textContent = filename; readerStatus.textContent = 'Loading PDF…';

  readerContent.innerHTML = '<div class="reader-placeholder"><div class="placeholder-icon">◌</div><h3>Loading document…</h3><p>Please wait while the PDF is prepared.</p></div>';

  pdfDoc = null; currentPage = 1; scale = 1; currentUrl = url; currentFilename = filename;

  try {

    let source;

    if (fileObject) source = { data: new Uint8Array(await fileObject.arrayBuffer()) };

    else source = { url };

    pdfDoc = await pdfjsLib.getDocument(source).promise;

    readerStatus.textContent = `${pdfDoc.numPages} pages · Ready`;

    pageTotal.textContent = `of ${pdfDoc.numPages}`;

    pageNumberInput.max = pdfDoc.numPages; pageNumberInput.value = 1;

    [prevBtn,nextBtn,zoomInBtn,zoomOutBtn,downloadBtn].forEach(b => b.disabled = false);

    downloadBtn.onclick = () => {

      const a = document.createElement('a'); a.href = currentUrl; a.download = currentFilename; a.click();

    };

    await renderPage(1);

  } catch (err) {

    readerStatus.textContent = 'Could not open PDF';

    readerContent.innerHTML = '<div class="reader-placeholder"><div class="placeholder-icon">!</div><h3>Unable to display this PDF</h3><p>The file may be damaged or the website may block PDF access. Try downloading the PDF and uploading it from your device.</p></div>';

    [prevBtn,nextBtn,zoomInBtn,zoomOutBtn,downloadBtn].forEach(b => b.disabled = true);

    console.error(err);

  }

}

async function renderPage(num) {

  if (!pdfDoc) return;

  currentPage = Math.max(1, Math.min(pdfDoc.numPages, num));

  pageNumberInput.value = currentPage;

  prevBtn.disabled = currentPage <= 1; nextBtn.disabled = currentPage >= pdfDoc.numPages;

  zoomLabel.textContent = Math.round(scale*100)+'%';

  readerContent.innerHTML = '';

  try {

    const page = await pdfDoc.getPage(currentPage);

    const viewport = page.getViewport({scale});

    const canvas = document.createElement('canvas'); canvas.className = 'pdf-page';

    const context = canvas.getContext('2d');

    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(viewport.width*dpr); canvas.height = Math.floor(viewport.height*dpr);

    canvas.style.width = `${viewport.width}px`; canvas.style.height = `${viewport.height}px`;

    readerContent.appendChild(canvas);

    if (renderTask) { try { renderTask.cancel(); } catch (_) {} }

    renderTask = page.render({canvasContext:context, viewport, transform: dpr !== 1 ? [dpr,0,0,dpr,0,0] : null});

    await renderTask.promise;

    readerContent.scrollTop = 0;

  } catch (err) { if (err.name !== 'RenderingCancelledException') console.error(err); }

}

prevBtn.addEventListener('click', () => renderPage(currentPage - 1));

nextBtn.addEventListener('click', () => renderPage(currentPage + 1));

pageNumberInput.addEventListener('change', () => renderPage(Number(pageNumberInput.value) || 1));

zoomInBtn.addEventListener('click', () => { scale = Math.min(2.5, +(scale + .15).toFixed(2)); renderPage(currentPage); });

zoomOutBtn.addEventListener('click', () => { scale = Math.max(.45, +(scale - .15).toFixed(2)); renderPage(currentPage); });

document.getElementById('fitWidth').addEventListener('click', async () => {

  if (!pdfDoc) return;

  const page = await pdfDoc.getPage(currentPage);

  const natural = page.getViewport({scale:1});

  scale = Math.min(2, Math.max(.45, (readerContent.clientWidth - 35) / natural.width));

  renderPage(currentPage);

});

window.addEventListener('resize', () => { if (pdfDoc && modal.classList.contains('open')) renderPage(currentPage); });

filterCards();
