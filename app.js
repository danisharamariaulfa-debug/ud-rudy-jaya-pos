// STATE MANAGEMENT SYSTEM
const defaultProducts = [
    { id: 'P01', name: 'Pupuk NPK Mutiara 16-16-16 (50kg)', category: 'PUPUK', unit: 'Zak', priceCost: 780000, priceRetail: 850000, priceGrosir: 825000, stock: 45, expDate: '2028-12-31' },
    { id: 'P02', name: 'Insektisida Prethon 200ml', category: 'PESTISIDA', unit: 'Botol', priceCost: 70000, priceRetail: 95000, priceGrosir: 85000, stock: 120, expDate: '2027-11-15' },
    { id: 'P03', name: 'Pupuk Urea Non-Subsidi 50kg', category: 'PUPUK', unit: 'Zak', priceCost: 510000, priceRetail: 560000, priceGrosir: 545000, stock: 80, expDate: '2029-05-20' },
    { id: 'P04', name: 'Fungisida Antracol 70WP 1kg', category: 'PESTISIDA', unit: 'Bungkus', priceCost: 90000, priceRetail: 115000, priceGrosir: 105000, stock: 30, expDate: '2026-08-10' }
];

const defaultCustomers = [
    { id: 'C00', name: 'Eceran / Umum', phone: '-', limit: 0, piutang: 0 },
    { id: 'C01', name: 'Kelompok Tani Subur Makmur', phone: '081299887766', limit: 15000000, piutang: 3500000 },
    { id: 'C02', name: 'Toko Tani Jaya (Pak Haji Kholil)', phone: '085211223344', limit: 25000000, piutang: 0 }
];

const state = {
    role: 'ADMIN',
    mode: 'RETAIL',
    currentCustomer: defaultCustomers[0],
    products: JSON.parse(localStorage.getItem('rudy_products')) || defaultProducts,
    customers: JSON.parse(localStorage.getItem('rudy_customers')) || defaultCustomers,
    cart: [],
    history: JSON.parse(localStorage.getItem('rudy_history')) || [],
    auditLog: JSON.parse(localStorage.getItem('rudy_auditLog')) || [],
    adjustments: JSON.parse(localStorage.getItem('rudy_adjustments')) || { TUNAI: 0, BANK: 0, PIUTANG: 0, PROFIT: 0 },
    lastTrxCounter: parseInt(localStorage.getItem('rudy_lastTrxCounter'), 10) || 0,
    dateFilter: { startDate: null, endDate: null },
    pendingTransaction: null
};

function saveStateToStorage() {
    localStorage.setItem('rudy_products', JSON.stringify(state.products));
    localStorage.setItem('rudy_customers', JSON.stringify(state.customers));
    localStorage.setItem('rudy_history', JSON.stringify(state.history));
    localStorage.setItem('rudy_auditLog', JSON.stringify(state.auditLog));
    localStorage.setItem('rudy_adjustments', JSON.stringify(state.adjustments));
    localStorage.setItem('rudy_lastTrxCounter', state.lastTrxCounter.toString());
}

function generateNextTrxId(prefix = 'TRX') {
    state.lastTrxCounter += 1;
    const formattedCounter = String(state.lastTrxCounter).padStart(5, '0');
    return `#${prefix}-${formattedCounter}`;
}

function getNextTrxIdPreview(prefix = 'TRX') {
    const nextCounter = state.lastTrxCounter + 1;
    return `#${prefix}-${String(nextCounter).padStart(5, '0')}`;
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('button, a, select, input').forEach(el => {
        el.style.touchAction = 'manipulation';
    });

    initNavigation();
    initRoleSwitching();
    initPOSControls();
    initModals();
    initReportExportControls();
    renderAll();
});

// NAVIGASI DENGAN TOUCH-FRIENDLY EVENT
function initNavigation() {
    const navButtons = [
        { btn: 'nav-pos', view: 'view-pos' },
        { btn: 'nav-inventory', view: 'view-inventory' },
        { btn: 'nav-customers', view: 'view-customers' },
        { btn: 'nav-history', view: 'view-history' },
        { btn: 'nav-reports', view: 'view-reports' }
    ];

    navButtons.forEach(item => {
        const btnElem = document.getElementById(item.btn);
        if (btnElem) {
            btnElem.addEventListener('click', () => {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.view-panel').forEach(v => {
                    v.classList.remove('active');
                    v.classList.add('hidden');
                });

                btnElem.classList.add('active');
                const targetView = document.getElementById(item.view);
                if (targetView) {
                    targetView.classList.remove('hidden');
                    targetView.classList.add('active');
                }
            });
        }
    });
}

function initRoleSwitching() {
    const btnSwitch = document.getElementById('btn-switch-role');
    if (btnSwitch) {
        btnSwitch.addEventListener('click', () => {
            if (state.role === 'ADMIN') {
                const pass = prompt("Masukkan PIN/Password Owner:");
                if (pass === 'RUDY88') {
                    state.role = 'OWNER';
                    alert("Login Berhasil! Anda masuk sebagai OWNER.");
                } else if (pass !== null) {
                    alert("Password Salah!");
                }
            } else {
                state.role = 'ADMIN';
                alert("Mode Berganti: ADMIN (Kasir).");
            }
            applyRoleRestrictions();
        });
    }
}

function applyRoleRestrictions() {
    const isOwner = state.role === 'OWNER';
    
    document.getElementById('current-role-name').innerText = isOwner ? 'OWNER (Full Akses)' : 'ADMIN (Kasir)';
    const badge = document.getElementById('role-badge');
    badge.className = isOwner 
        ? 'bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2'
        : 'bg-amber-500/20 border border-amber-400/40 text-amber-200 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2';

    document.querySelectorAll('.owner-only').forEach(el => el.classList.toggle('hidden', !isOwner));
    
    const btnAddProd = document.getElementById('btn-add-product');
    if (btnAddProd) btnAddProd.disabled = !isOwner;
    
    const cartDisc = document.getElementById('cart-discount');
    if (cartDisc) cartDisc.disabled = !isOwner;

    renderAll();
}

function initPOSControls() {
    const btnRetail = document.getElementById('mode-retail');
    const btnGrosir = document.getElementById('mode-grosir');

    if (btnRetail && btnGrosir) {
        btnRetail.addEventListener('click', () => {
            state.mode = 'RETAIL';
            btnRetail.className = "flex-1 py-1.5 text-center bg-white text-emerald-800 rounded-lg shadow-sm transition cursor-pointer";
            btnGrosir.className = "flex-1 py-1.5 text-center text-slate-500 hover:text-slate-800 transition cursor-pointer";
            renderCart();
            renderProducts();
        });

        btnGrosir.addEventListener('click', () => {
            state.mode = 'GROSIR';
            btnGrosir.className = "flex-1 py-1.5 text-center bg-white text-emerald-800 rounded-lg shadow-sm transition cursor-pointer";
            btnRetail.className = "flex-1 py-1.5 text-center text-slate-500 hover:text-slate-800 transition cursor-pointer";
            renderCart();
            renderProducts();
        });
    }

    document.getElementById('pos-search')?.addEventListener('input', renderProducts);
    document.getElementById('pos-category-filter')?.addEventListener('change', renderProducts);
    document.getElementById('inventory-search')?.addEventListener('input', renderInventoryTable);
    document.getElementById('customer-view-search')?.addEventListener('input', renderCustomers);
    document.getElementById('history-search-input')?.addEventListener('input', renderAdminHistory);
    document.getElementById('audit-search-input')?.addEventListener('input', renderReports);

    document.getElementById('cust-search-input')?.addEventListener('input', (e) => {
        renderCustomerOptions(e.target.value);
    });

    document.getElementById('cart-customer-select')?.addEventListener('change', (e) => {
        state.currentCustomer = state.customers.find(c => c.id === e.target.value) || state.customers[0];
    });

    document.getElementById('cart-discount')?.addEventListener('input', renderCartSummary);
    document.getElementById('btn-checkout')?.addEventListener('click', handleInitiateCheckout);
    document.getElementById('btn-quick-add-cust')?.addEventListener('click', openAddCustomerModal);
}

function addToCart(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product || product.stock <= 0) {
        alert("Stok barang habis!");
        return;
    }

    const existing = state.cart.find(item => item.id === productId);
    if (existing) {
        if (existing.qty + 1 > product.stock) {
            alert("Jumlah melebihi stok tersedia!");
            return;
        }
        existing.qty += 1;
    } else {
        state.cart.push({ id: product.id, qty: 1 });
    }
    renderCart();
}

function updateCartQty(productId, delta) {
    const item = state.cart.find(i => i.id === productId);
    const product = state.products.find(p => p.id === productId);
    
    if (item && product) {
        const newQty = item.qty + delta;
        if (newQty > product.stock) {
            alert("Jumlah melebihi stok fisik!");
            return;
        }
        if (newQty <= 0) {
            state.cart = state.cart.filter(i => i.id !== productId);
        } else {
            item.qty = newQty;
        }
    }
    renderCart();
}

function setCartQtyDirect(productId, val) {
    const item = state.cart.find(i => i.id === productId);
    const product = state.products.find(p => p.id === productId);
    let parsedVal = parseInt(val, 10);

    if (item && product) {
        if (isNaN(parsedVal) || parsedVal <= 0) {
            state.cart = state.cart.filter(i => i.id !== productId);
        } else if (parsedVal > product.stock) {
            alert(`Jumlah melebihi stok fisik yang tersedia! (Stok Maksimal: ${product.stock})`);
            item.qty = product.stock;
        } else {
            item.qty = parsedVal;
        }
    }
    renderCart();
}

function removeFromCart(productId) {
    state.cart = state.cart.filter(i => i.id !== productId);
    renderCart();
}

function handleInitiateCheckout() {
    if (state.cart.length === 0) {
        alert("Keranjang masih kosong!");
        return;
    }

    const selectElem = document.getElementById('cart-customer-select');
    const selectedCustId = selectElem ? selectElem.value : null;
    
    const customer = state.customers.find(c => c.id === selectedCustId) || state.customers[0];
    state.currentCustomer = customer;

    const method = document.getElementById('payment-method').value;
    const isGrosir = state.mode === 'GROSIR';

    if (method === 'TEMPO') {
        if (!customer || customer.id === 'C00') {
            alert("Transaksi TEMPO/HUTANG memerlukan nama pelanggan tercatat!");
            return;
        }
    }

    let subtotal = 0;
    const cartItemsDetails = [];

    state.cart.forEach(item => {
        const prod = state.products.find(p => p.id === item.id);
        const price = isGrosir ? prod.priceGrosir : prod.priceRetail;
        const priceCost = prod.priceCost || price;
        subtotal += price * item.qty;

        cartItemsDetails.push({
            id: prod.id,
            name: prod.name,
            category: prod.category,
            qty: item.qty,
            unit: prod.unit,
            priceCost: priceCost,
            price: price,
            subtotal: price * item.qty,
            profit: (price - priceCost) * item.qty
        });
    });

    const discount = parseFloat(document.getElementById('cart-discount').value) || 0;
    const total = subtotal - discount;

    if (method === 'TEMPO') {
        if ((customer.piutang + total) > customer.limit) {
            alert(`Gagal Transaksi: Limit Piutang Pelanggan Tidak Cukup!`);
            return;
        }
    }

    state.pendingTransaction = {
        date: new Date().toLocaleString('id-ID'),
        mode: state.mode,
        customerId: customer.id,
        customer: customer.name,
        total: total,
        discount: discount,
        method: method,
        status: 'SUCCESS',
        operator: state.role,
        items: cartItemsDetails
    };

    document.getElementById('confirm-customer-name').innerText = customer.name;
    document.getElementById('confirm-mode').innerText = state.mode === 'GROSIR' ? 'Grosir' : 'Retail (Eceran)';
    document.getElementById('confirm-method').innerText = method === 'TEMPO' ? 'TEMPO / HUTANG' : method;
    document.getElementById('confirm-total').innerText = 'Rp ' + total.toLocaleString();
    document.getElementById('agree-total-display').innerText = 'Rp ' + total.toLocaleString();

    document.getElementById('payment-step-1').classList.remove('hidden');
    document.getElementById('payment-step-2').classList.add('hidden');
    
    const modal = document.getElementById('modal-payment-confirm');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function finalizeCheckout() {
    const trxData = state.pendingTransaction;
    if (!trxData) return;

    trxData.id = generateNextTrxId('TRX');

    if (trxData.method === 'TEMPO') {
        const cust = state.customers.find(c => c.id === trxData.customerId);
        if (cust) {
            cust.piutang += trxData.total;
        }
    }

    trxData.items.forEach(item => {
        const prod = state.products.find(p => p.id === item.id);
        if (prod) {
            prod.stock -= item.qty;
        }
    });

    state.history.unshift(trxData);
    state.auditLog.unshift({ ...trxData, loggedAt: new Date().toISOString() });

    saveStateToStorage();

    const modal = document.getElementById('modal-payment-confirm');
    modal.classList.add('hidden');
    modal.classList.remove('flex');

    showReceiptModal(trxData.id, trxData.total, trxData.method, trxData.customer, trxData.items, trxData.date);

    state.cart = [];
    state.pendingTransaction = null;
    document.getElementById('cart-discount').value = 0;
    renderAll();
}

function renderAll() {
    renderPosTrxLabel();
    renderProducts();
    renderCart();
    renderInventoryTable();
    renderCustomers();
    renderCustomerOptions();
    renderAdminHistory();
    renderReports();
    renderPosHistory();
}

function renderPosTrxLabel() {
    const labelElem = document.getElementById('trx-id-label');
    if (labelElem) {
        labelElem.innerText = getNextTrxIdPreview('TRX');
    }
}

function renderProducts() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    const search = (document.getElementById('pos-search')?.value || '').toLowerCase();
    const cat = document.getElementById('pos-category-filter')?.value || 'ALL';

    grid.innerHTML = '';

    const filtered = state.products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search) || p.id.toLowerCase().includes(search);
        const matchCat = cat === 'ALL' || p.category === cat;
        return matchSearch && matchCat;
    });

    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = "bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-emerald-500 transition";
        card.innerHTML = `
            <div>
                <div class="flex justify-between items-start mb-2">
                    <span class="text-[10px] ${p.category === 'PUPUK' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'} font-bold px-2 py-0.5 rounded-md">${p.category}</span>
                    <span class="text-[11px] ${p.stock < 10 ? 'text-rose-600 font-bold' : 'text-slate-400'}">Stok: ${p.stock} ${p.unit}</span>
                </div>
                <h3 class="font-bold text-slate-800 text-xs leading-snug">${p.name}</h3>
                <p class="text-[10px] text-slate-400 mt-1">Exp: ${p.expDate || '-'}</p>
            </div>
            <div class="mt-3 pt-2 border-t border-slate-100">
                <div>
                    <span class="text-base font-extrabold text-emerald-800 block">Rp ${p.priceRetail.toLocaleString()}</span>
                    <span class="text-[10px] text-slate-400 font-normal block">Grosir: Rp ${p.priceGrosir.toLocaleString()}</span>
                </div>
                <button type="button" onclick="addToCart('${p.id}')" class="mt-2 w-full bg-emerald-50 hover:bg-emerald-700 text-emerald-700 hover:text-white py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer">
                    <i class="fa-solid fa-plus text-[10px]"></i> Tambah
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderCart() {
    const list = document.getElementById('cart-items-list');
    if (!list) return;
    list.innerHTML = '';
    const isGrosir = state.mode === 'GROSIR';

    if (state.cart.length === 0) {
        list.innerHTML = `<p class="text-center text-xs text-slate-400 py-6">Keranjang kosong</p>`;
    } else {
        state.cart.forEach(item => {
            const prod = state.products.find(p => p.id === item.id);
            const price = isGrosir ? prod.priceGrosir : prod.priceRetail;

            const div = document.createElement('div');
            div.className = "flex justify-between items-center text-xs p-2 rounded-xl bg-emerald-50 border border-emerald-300 shadow-sm transition";
            div.innerHTML = `
                <div class="flex-1 pr-2">
                    <p class="font-bold text-emerald-900 line-clamp-1">${prod.name}</p>
                    <p class="text-[10px] text-emerald-700 font-medium">Rp ${price.toLocaleString()} x ${item.qty} ${prod.unit}</p>
                </div>
                <div class="flex items-center gap-2">
                    <div class="flex items-center border border-emerald-200 rounded-lg overflow-hidden bg-white">
                        <button type="button" onclick="updateCartQty('${prod.id}', -1)" class="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold cursor-pointer">-</button>
                        <input type="number" value="${item.qty}" min="1" max="${prod.stock}" onchange="setCartQtyDirect('${prod.id}', this.value)" class="w-10 text-center py-0.5 font-bold text-[11px] bg-white border-x border-emerald-200 focus:outline-none">
                        <button type="button" onclick="updateCartQty('${prod.id}', 1)" class="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold cursor-pointer">+</button>
                    </div>
                    <button type="button" onclick="removeFromCart('${prod.id}')" title="Hapus produk" class="text-rose-500 hover:text-rose-700 p-1.5 rounded transition cursor-pointer">
                        <i class="fa-solid fa-trash text-xs"></i>
                    </button>
                </div>
            `;
            list.appendChild(div);
        });
    }
    renderCartSummary();
}

function renderCartSummary() {
    const isGrosir = state.mode === 'GROSIR';
    let subtotal = 0;

    state.cart.forEach(item => {
        const prod = state.products.find(p => p.id === item.id);
        const price = isGrosir ? prod.priceGrosir : prod.priceRetail;
        subtotal += price * item.qty;
    });

    const discount = parseFloat(document.getElementById('cart-discount')?.value) || 0;
    const total = Math.max(0, subtotal - discount);

    document.getElementById('cart-subtotal').innerText = 'Rp ' + subtotal.toLocaleString();
    document.getElementById('cart-total').innerText = 'Rp ' + total.toLocaleString();
}

function renderInventoryTable() {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;
    const search = (document.getElementById('inventory-search')?.value || '').toLowerCase();
    tbody.innerHTML = '';

    const filtered = state.products.filter(p => p.name.toLowerCase().includes(search) || p.id.toLowerCase().includes(search));

    filtered.forEach(p => {
        const costPrice = p.priceCost || 0;
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50";
        tr.innerHTML = `
            <td class="p-3.5 font-semibold text-slate-800">${p.name}</td>
            <td class="p-3.5"><span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">${p.category}</span></td>
            <td class="p-3.5 text-amber-700 font-bold">Rp ${costPrice.toLocaleString()}</td>
            <td class="p-3.5 font-bold text-emerald-800">Rp ${p.priceRetail.toLocaleString()}</td>
            <td class="p-3.5 text-slate-500">Rp ${p.priceGrosir.toLocaleString()}</td>
            <td class="p-3.5 font-bold">${p.stock} ${p.unit}</td>
            <td class="p-3.5 text-center">
                <button type="button" onclick="deleteProduct('${p.id}')" class="text-rose-500 hover:text-rose-700 p-1 cursor-pointer" ${state.role !== 'OWNER' ? 'disabled style="opacity:0.3"' : ''}>
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function deleteProduct(productId) {
    if (state.role !== 'OWNER') {
        alert("Akses Ditolak: Hanya Owner yang bisa menghapus produk!");
        return;
    }
    if (confirm("Yakin ingin menghapus produk ini dari database?")) {
        state.products = state.products.filter(p => p.id !== productId);
        saveStateToStorage();
        renderAll();
    }
}

function renderPosHistory() {
    const container = document.getElementById('pos-history-list');
    if (!container) return;
    container.innerHTML = '';

    if (state.history.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400 text-center py-2">Belum ada transaksi</p>`;
        return;
    }

    state.history.slice(0, 5).forEach(h => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center text-xs p-2 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition";
        div.onclick = () => reopenReceiptModal(h.id);
        div.innerHTML = `
            <div>
                <span class="font-bold text-slate-800 hover:text-emerald-700">${h.id}</span>
                <p class="text-[10px] text-slate-400">${h.date} - ${h.customer}</p>
            </div>
            <div class="text-right">
                <span class="font-bold text-emerald-700">Rp ${h.total.toLocaleString()}</span>
                <p class="text-[10px] font-semibold text-slate-500">${h.method}</p>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderAdminHistory() {
    const tbody = document.getElementById('admin-history-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchQuery = (document.getElementById('history-search-input')?.value || '').toLowerCase();

    const filteredHistory = state.history.filter(h => {
        const matchId = h.id.toLowerCase().includes(searchQuery);
        const matchCustomer = h.customer.toLowerCase().includes(searchQuery);
        const matchDate = h.date.toLowerCase().includes(searchQuery);
        const matchMode = (h.mode === 'PELUNASAN_PIUTANG' ? 'bayar utang pelunasan' : h.mode).toLowerCase().includes(searchQuery);
        return matchId || matchCustomer || matchDate || matchMode;
    });

    if (filteredHistory.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-400">Tidak ada riwayat transaksi yang cocok.</td></tr>`;
        return;
    }

    filteredHistory.forEach(h => {
        const isVoid = h.status === 'VOID';
        const isPelunasan = h.mode === 'PELUNASAN_PIUTANG';
        const tr = document.createElement('tr');
        tr.className = isVoid ? "bg-rose-50/50" : "hover:bg-slate-50";
        tr.innerHTML = `
            <td class="p-3 text-[11px] text-slate-500">${h.date}</td>
            <td class="p-3 font-bold text-slate-800 cursor-pointer hover:text-emerald-600 hover:underline" onclick="reopenReceiptModal('${h.id}')">${h.id}</td>
            <td class="p-3"><span class="${isPelunasan ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'} px-2 py-0.5 rounded text-[10px] font-bold">${isPelunasan ? 'BAYAR UTANG' : h.mode}</span></td>
            <td class="p-3 font-semibold text-slate-700">${h.customer}</td>
            <td class="p-3 font-bold ${isVoid ? 'line-through text-slate-400' : 'text-emerald-700'}">Rp ${h.total.toLocaleString()}</td>
            <td class="p-3"><span class="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">${h.method}</span></td>
            <td class="p-3 text-center flex items-center justify-center gap-2">
                <button type="button" onclick="reopenReceiptModal('${h.id}')" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer">
                    <i class="fa-solid fa-print"></i> Nota
                </button>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isVoid ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}">
                    ${isVoid ? 'DIBATALKAN' : 'BERHASIL'}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderCustomers() {
    const container = document.getElementById('customers-cards-container');
    if (!container) return;
    container.innerHTML = '';

    const searchQuery = (document.getElementById('customer-view-search')?.value || '').toLowerCase();

    const filteredCustomers = state.customers.filter(c => {
        if (c.id === 'C00') return false;
        const matchName = c.name.toLowerCase().includes(searchQuery);
        const matchPhone = c.phone.toLowerCase().includes(searchQuery);
        return matchName || matchPhone;
    });

    if (filteredCustomers.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-8 text-xs text-slate-400">Tidak ada data pelanggan yang cocok.</div>`;
        return;
    }

    filteredCustomers.forEach(c => {
        const percent = Math.min(100, Math.round((c.piutang / c.limit) * 100));
        const div = document.createElement('div');
        div.className = "bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between";
        div.innerHTML = `
            <div class="space-y-2">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="font-bold text-slate-800 text-sm">${c.name}</h3>
                        <p class="text-xs text-slate-500 font-mono mt-0.5"><i class="fa-solid fa-phone text-[10px] text-slate-400"></i> ${c.phone}</p>
                    </div>
                    <div class="flex items-center gap-1">
                        <button type="button" onclick="openEditCustomer('${c.id}')" title="Edit Pelanggan" class="text-slate-400 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer">
                            <i class="fa-solid fa-pen-to-square text-xs"></i>
                        </button>
                    </div>
                </div>
                <div class="space-y-1 pt-1">
                    <div class="flex justify-between text-xs">
                        <span class="text-slate-500">Sisa Piutang:</span>
                        <span class="font-bold text-rose-600">Rp ${c.piutang.toLocaleString()}</span>
                    </div>
                    <div class="flex justify-between text-[11px] text-slate-400">
                        <span>Limit Kredit:</span>
                        <span>Rp ${c.limit.toLocaleString()}</span>
                    </div>
                    <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
                        <div class="bg-rose-500 h-full" style="width: ${percent}%"></div>
                    </div>
                </div>
            </div>

            <div class="pt-2 border-t border-slate-100 space-y-1.5">
                <button type="button" onclick="viewCustomerHistory('${c.id}')" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-1.5 rounded-xl transition flex justify-center items-center gap-1.5 cursor-pointer">
                    <i class="fa-solid fa-receipt text-[10px]"></i> Lihat Riwayat Belanja & Pelunasan
                </button>
                <button type="button" onclick="bayarPiutang('${c.id}')" class="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold py-1.5 rounded-xl transition cursor-pointer">
                    Bayar / Pelunasan Piutang
                </button>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderCustomerOptions(filterQuery = '') {
    const select = document.getElementById('cart-customer-select');
    if (!select) return;
    
    select.innerHTML = '';
    const query = filterQuery.toLowerCase();
    const filtered = state.customers.filter(c => c.name.toLowerCase().includes(query) || c.phone.includes(query));

    filtered.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.innerText = c.id === 'C00' ? 'Eceran / Umum' : `${c.name} (${c.phone})`;
        select.appendChild(opt);
    });

    if (state.currentCustomer && filtered.some(c => c.id === state.currentCustomer.id)) {
        select.value = state.currentCustomer.id;
    } else if (filtered.length > 0) {
        state.currentCustomer = filtered[0];
        select.value = filtered[0].id;
    }
}

function openAddCustomerModal() {
    document.getElementById('edit-cust-id').value = '';
    document.getElementById('edit-cust-name').value = '';
    document.getElementById('edit-cust-phone').value = '';
    document.getElementById('edit-cust-limit').value = 10000000;
    document.getElementById('edit-cust-piutang').value = 0;
    document.getElementById('modal-cust-title').innerText = 'Tambah Pelanggan Baru';

    const modal = document.getElementById('modal-edit-customer');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function openEditCustomer(customerId) {
    const cust = state.customers.find(c => c.id === customerId);
    if (!cust) return;

    document.getElementById('edit-cust-id').value = cust.id;
    document.getElementById('edit-cust-name').value = cust.name;
    document.getElementById('edit-cust-phone').value = cust.phone;
    document.getElementById('edit-cust-limit').value = cust.limit;
    document.getElementById('edit-cust-piutang').value = cust.piutang;
    document.getElementById('modal-cust-title').innerText = 'Edit Data Pelanggan';

    const modal = document.getElementById('modal-edit-customer');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function viewCustomerHistory(customerId) {
    const cust = state.customers.find(c => c.id === customerId);
    if (!cust) return;

    document.getElementById('cust-history-title').innerText = `Riwayat Transaksi: ${cust.name}`;
    document.getElementById('cust-history-sub').innerText = `No. HP: ${cust.phone} | Sisa Piutang: Rp ${cust.piutang.toLocaleString()}`;

    const body = document.getElementById('cust-history-body');
    body.innerHTML = '';

    const custTrx = state.auditLog.filter(h => h.customerId === customerId || h.customer === cust.name);

    if (custTrx.length === 0) {
        body.innerHTML = `<p class="text-center text-slate-400 py-6">Belum ada riwayat transaksi belanja atau pelunasan.</p>`;
    } else {
        custTrx.forEach(t => {
            const isVoid = t.status === 'VOID';
            const isPelunasan = t.mode === 'PELUNASAN_PIUTANG';
            const card = document.createElement('div');
            card.className = "pt-2 space-y-1.5";
            
            let itemsHtml = '';
            if (isPelunasan) {
                itemsHtml = `<div class="p-2 bg-blue-50/60 rounded-lg text-blue-900 font-semibold text-[11px]"><i class="fa-solid fa-hand-holding-dollar"></i> Pembayaran Pelunasan Piutang</div>`;
            } else if (t.items && t.items.length > 0) {
                itemsHtml = t.items.map(i => `<div class="flex justify-between text-slate-600"><span>• ${i.name} x${i.qty}</span><span>Rp ${(i.price * i.qty).toLocaleString()}</span></div>`).join('');
            }

            card.innerHTML = `
                <div class="flex justify-between items-center font-semibold text-slate-800 cursor-pointer hover:text-emerald-700" onclick="reopenReceiptModal('${t.id}')">
                    <span class="flex items-center gap-1.5">
                        ${t.id} 
                        <span class="text-[10px] text-slate-400 font-normal">(${t.date})</span>
                        ${isPelunasan ? '<span class="bg-blue-100 text-blue-800 text-[9px] font-bold px-1.5 py-0.5 rounded">PELUNASAN UTANG</span>' : ''}
                    </span>
                    <span class="${isVoid ? 'line-through text-slate-400' : 'text-emerald-700'}">Rp ${t.total.toLocaleString()}</span>
                </div>
                <div class="bg-slate-50 p-2 rounded-lg space-y-1 border border-slate-100 text-[11px]">
                    ${itemsHtml || '<p class="text-slate-400 italic">Detail transaksi tidak tersedia</p>'}
                </div>
                <div class="flex justify-between text-[10px] text-slate-400 pt-0.5">
                    <span>Metode: <strong>${t.method}</strong></span>
                    <span class="${isVoid ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}">${isVoid ? 'DIBATALKAN' : 'SUCCESS'}</span>
                </div>
            `;
            body.appendChild(card);
        });
    }

    const modal = document.getElementById('modal-cust-history');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function bayarPiutang(customerId) {
    const cust = state.customers.find(c => c.id === customerId);
    if (!cust || cust.piutang <= 0) {
        alert("Pelanggan ini tidak memiliki piutang berjalan.");
        return;
    }

    const unpaidTempoTrx = state.auditLog.filter(h => 
        (h.customerId === customerId || h.customer === cust.name) && 
        h.method === 'TEMPO' && 
        h.status !== 'VOID'
    );

    let modalOverlay = document.getElementById('modal-pay-tempo');
    if (!modalOverlay) {
        modalOverlay = document.createElement('div');
        modalOverlay.id = 'modal-pay-tempo';
        modalOverlay.className = "fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto";
        document.body.appendChild(modalOverlay);
    }

    let listHtml = '';
    if (unpaidTempoTrx.length === 0) {
        listHtml = `<p class="text-center text-xs text-slate-400 py-4">Tidak ada nota tempo spesifik, namun tercatat sisa piutang berjalan.</p>`;
    } else {
        unpaidTempoTrx.forEach((trx) => {
            listHtml += `
                <div class="p-3 border border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50/50 transition cursor-pointer flex justify-between items-center group" onclick="openPaymentDetailModal('${cust.id}', '${trx.id}', ${trx.total})">
                    <div>
                        <span class="font-bold text-slate-800 group-hover:text-emerald-700">${trx.id}</span>
                        <p class="text-[10px] text-slate-400">${trx.date}</p>
                    </div>
                    <div class="text-right">
                        <span class="font-extrabold text-emerald-800">Rp ${trx.total.toLocaleString()}</span>
                        <span class="block text-[10px] text-emerald-600 font-semibold group-hover:underline">Klik Bayar Nota</span>
                    </div>
                </div>
            `;
        });
    }

    modalOverlay.innerHTML = `
        <div class="bg-white rounded-2xl p-5 w-full max-w-md border border-slate-200 shadow-xl space-y-4 my-auto">
            <div class="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                    <h3 class="font-bold text-slate-800 text-sm">Pilih Nota Hutang: ${cust.name}</h3>
                    <p class="text-[11px] text-slate-400">Total Piutang Berjalan: Rp ${cust.piutang.toLocaleString()}</p>
                </div>
                <button type="button" onclick="document.getElementById('modal-pay-tempo').remove()" class="text-slate-400 hover:text-slate-600 cursor-pointer"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
                ${listHtml}
            </div>
            <button type="button" onclick="document.getElementById('modal-pay-tempo').remove()" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded-xl font-bold text-xs cursor-pointer">Tutup</button>
        </div>
    `;
    modalOverlay.classList.remove('hidden');
    modalOverlay.classList.add('flex');
}

function openPaymentDetailModal(customerId, trxId, maxAmount) {
    const listModal = document.getElementById('modal-pay-tempo');
    if (listModal) listModal.remove();

    let detailModal = document.getElementById('modal-pay-detail');
    if (!detailModal) {
        detailModal = document.createElement('div');
        detailModal.id = 'modal-pay-detail';
        detailModal.className = "fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto";
        document.body.appendChild(detailModal);
    }

    detailModal.innerHTML = `
        <div class="bg-white rounded-2xl p-5 w-full max-w-sm border border-slate-200 shadow-xl space-y-4 text-xs my-auto">
            <div class="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                    <h3 class="font-bold text-slate-800 text-sm">Form Pembayaran Nota</h3>
                    <p class="text-[11px] text-emerald-700 font-semibold">Nota: ${trxId}</p>
                </div>
                <button type="button" onclick="document.getElementById('modal-pay-detail').remove()" class="text-slate-400 hover:text-slate-600 cursor-pointer"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="space-y-3">
                <div>
                    <label class="block font-semibold text-slate-600 mb-1">Nominal Pembayaran (Rp)</label>
                    <input type="number" id="input-pay-nominal" value="${maxAmount}" max="${maxAmount}" min="1" class="w-full border border-emerald-300 bg-emerald-50/50 rounded-xl px-3 py-2 font-bold text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500">
                    <p class="text-[10px] text-slate-400 mt-0.5">Maksimal tagihan nota: Rp ${maxAmount.toLocaleString()}</p>
                </div>
                <div>
                    <label class="block font-semibold text-slate-600 mb-1">Pilih Metode Pembayaran</label>
                    <select id="select-pay-method" class="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-bold text-slate-700">
                        <option value="TUNAI">💵 Tunai / Cash (Kas Laci)</option>
                        <option value="TRANSFER">🏦 Transfer Bank / QRIS</option>
                    </select>
                </div>
            </div>
            <div class="pt-2 flex gap-2">
                <button type="button" onclick="document.getElementById('modal-pay-detail').remove()" class="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl font-bold cursor-pointer">Batal</button>
                <button type="button" onclick="executePelunasanPiutang('${customerId}', '${trxId}', ${maxAmount})" class="w-1/2 bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-xl font-bold cursor-pointer">Proses Bayar</button>
            </div>
        </div>
    `;
    detailModal.classList.remove('hidden');
    detailModal.classList.add('flex');
}

function executePelunasanPiutang(customerId, trxId, maxAmount) {
    const cust = state.customers.find(c => c.id === customerId);
    const targetTrx = state.auditLog.find(h => h.id === trxId);
    if (!cust || !targetTrx) return;

    const nominalInput = parseFloat(document.getElementById('input-pay-nominal').value);
    const selectedMethod = document.getElementById('select-pay-method').value;

    if (isNaN(nominalInput) || nominalInput <= 0) {
        alert("Masukkan nominal pembayaran yang valid!");
        return;
    }
    if (nominalInput > maxAmount) {
        alert(`Nominal pembayaran melebihi sisa tagihan nota ini!`);
        return;
    }

    const detailModal = document.getElementById('modal-pay-detail');
    if (detailModal) detailModal.remove();

    if (nominalInput >= maxAmount) {
        targetTrx.method = `${selectedMethod} (LUNAS TEMPO)`;
    }

    cust.piutang = Math.max(0, cust.piutang - nominalInput);

    const payTrxId = generateNextTrxId('PAY');
    const paymentTrxData = {
        id: payTrxId,
        date: new Date().toLocaleString('id-ID'),
        mode: 'PELUNASAN_PIUTANG',
        customerId: cust.id,
        customer: cust.name,
        total: nominalInput,
        discount: 0,
        method: selectedMethod,
        status: 'SUCCESS',
        operator: state.role,
        items: [{ name: `Pelunasan Nota ${targetTrx.id}`, qty: 1, price: nominalInput }]
    };

    state.history.unshift(paymentTrxData);
    state.auditLog.unshift({ ...paymentTrxData, loggedAt: new Date().toISOString() });

    saveStateToStorage();
    alert(`Pembayaran pelunasan sebesar Rp ${nominalInput.toLocaleString()} (${selectedMethod}) berhasil dicatat!\nNota: ${payTrxId}`);
    renderAll();
}

function isTransactionInDateRange(trxDateStr) {
    if (!state.dateFilter.startDate && !state.dateFilter.endDate) return true;
    
    let trxDate = new Date(trxDateStr);
    if (isNaN(trxDate.getTime())) {
        const parts = trxDateStr.split(',');
        if (parts.length > 0) {
            const dateParts = parts[0].trim().split('/');
            if (dateParts.length === 3) {
                trxDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
            }
        }
    }

    if (isNaN(trxDate.getTime())) return true;

    if (state.dateFilter.startDate) {
        const start = new Date(state.dateFilter.startDate);
        start.setHours(0, 0, 0, 0);
        if (trxDate < start) return false;
    }

    if (state.dateFilter.endDate) {
        const end = new Date(state.dateFilter.endDate);
        end.setHours(23, 59, 59, 999);
        if (trxDate > end) return false;
    }

    return true;
}

function renderReports() {
    let totalCash = 0;
    let totalBank = 0;
    let totalProfit = 0;
    
    const validTransactions = state.auditLog.filter(h => h.status !== 'VOID' && isTransactionInDateRange(h.date));

    validTransactions.forEach(h => {
        if (h.method.includes('TUNAI')) {
            totalCash += h.total;
        } else if (h.method.includes('TRANSFER') || h.method.includes('QRIS')) {
            totalBank += h.total;
        }

        if (h.mode !== 'PELUNASAN_PIUTANG' && h.items && h.items.length > 0) {
            h.items.forEach(item => {
                const cost = item.priceCost || 0;
                const profitPerItem = (item.price - cost) * item.qty;
                totalProfit += profitPerItem;
            });
        }
        totalProfit -= (h.discount || 0);
    });

    let totalPiutang = 0;
    state.customers.forEach(c => totalPiutang += c.piutang);

    totalCash += (state.adjustments.TUNAI || 0);
    totalBank += (state.adjustments.BANK || 0);
    totalPiutang += (state.adjustments.PIUTANG || 0);
    totalProfit += (state.adjustments.PROFIT || 0);

    const cashElem = document.getElementById('report-cash-total');
    if (cashElem) cashElem.innerText = 'Rp ' + Math.max(0, totalCash).toLocaleString();
    
    const bankElem = document.getElementById('report-bank-total');
    if (bankElem) bankElem.innerText = 'Rp ' + Math.max(0, totalBank).toLocaleString();
    
    const piutangElem = document.getElementById('report-total-piutang');
    if (piutangElem) piutangElem.innerText = 'Rp ' + Math.max(0, totalPiutang).toLocaleString();
    
    const profitElem = document.getElementById('report-total-profit');
    if (profitElem) profitElem.innerText = 'Rp ' + Math.max(0, totalProfit).toLocaleString();

    renderBestSellerTable(validTransactions);

    const tbody = document.getElementById('history-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchQuery = (document.getElementById('audit-search-input')?.value || '').toLowerCase();

    const filteredAudit = state.auditLog.filter(h => {
        const matchRange = isTransactionInDateRange(h.date);
        const matchId = h.id.toLowerCase().includes(searchQuery);
        const matchCustomer = h.customer.toLowerCase().includes(searchQuery);
        const matchDate = h.date.toLowerCase().includes(searchQuery);
        const matchMode = (h.mode === 'PELUNASAN_PIUTANG' ? 'bayar utang pelunasan' : h.mode).toLowerCase().includes(searchQuery);
        return matchRange && (matchId || matchCustomer || matchDate || matchMode);
    });

    if (filteredAudit.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-400">Tidak ada log transaksi yang cocok.</td></tr>`;
        return;
    }

    filteredAudit.forEach(h => {
        const isVoid = h.status === 'VOID';
        const isPelunasan = h.mode === 'PELUNASAN_PIUTANG';
        const tr = document.createElement('tr');
        tr.className = isVoid ? "bg-rose-50/50" : "hover:bg-slate-50";
        tr.innerHTML = `
            <td class="p-3 text-[11px] text-slate-500">${h.date}</td>
            <td class="p-3 font-bold text-slate-800 cursor-pointer hover:text-emerald-600 hover:underline" onclick="reopenReceiptModal('${h.id}')">${h.id}</td>
            <td class="p-3"><span class="${isPelunasan ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'} px-2 py-0.5 rounded text-[10px] font-bold">${isPelunasan ? 'BAYAR UTANG' : h.mode}</span></td>
            <td class="p-3 font-semibold text-slate-700">${h.customer}</td>
            <td class="p-3 font-bold ${isVoid ? 'line-through text-slate-400' : 'text-emerald-700'}">Rp ${h.total.toLocaleString()}</td>
            <td class="p-3"><span class="${h.method.includes('TEMPO') ? 'bg-rose-100 text-rose-800 font-bold' : 'bg-slate-100 text-slate-700'} px-2 py-0.5 rounded text-[10px] font-semibold">${h.method}</span></td>
            <td class="p-3 text-center flex items-center justify-center gap-1.5">
                <button type="button" onclick="reopenReceiptModal('${h.id}')" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer">
                    <i class="fa-solid fa-print"></i>
                </button>
                ${!isVoid ? `<button type="button" onclick="voidTransaction('${h.id}')" class="text-rose-500 hover:text-rose-700 font-semibold text-[11px] cursor-pointer" ${state.role !== 'OWNER' ? 'disabled style="opacity:0.3"' : ''}>Void</button>` : '<span class="text-slate-400 text-[10px] italic">Dibatalkan</span>'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderBestSellerTable(validTransactions) {
    const tbody = document.getElementById('best-seller-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const productSalesMap = {};

    validTransactions.forEach(trx => {
        if (trx.mode !== 'PELUNASAN_PIUTANG' && trx.items && trx.items.length > 0) {
            trx.items.forEach(item => {
                if (!productSalesMap[item.id]) {
                    productSalesMap[item.id] = {
                        id: item.id,
                        name: item.name,
                        category: item.category || 'PUPUK',
                        unit: item.unit || 'Pcs',
                        totalQty: 0,
                        totalRevenue: 0,
                        totalProfit: 0
                    };
                }
                const cost = item.priceCost || 0;
                productSalesMap[item.id].totalQty += item.qty;
                productSalesMap[item.id].totalRevenue += (item.price * item.qty);
                productSalesMap[item.id].totalProfit += ((item.price - cost) * item.qty);
            });
        }
    });

    const sortedProducts = Object.values(productSalesMap).sort((a, b) => b.totalQty - a.totalQty);

    if (sortedProducts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-400">Belum ada data transaksi penjualan.</td></tr>`;
        return;
    }

    sortedProducts.forEach((p, index) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50";
        tr.innerHTML = `
            <td class="p-3 font-bold text-center text-slate-500">#${index + 1}</td>
            <td class="p-3 font-semibold text-slate-800">${p.name}</td>
            <td class="p-3"><span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">${p.category}</span></td>
            <td class="p-3 text-center font-extrabold text-emerald-800 bg-emerald-50/50">${p.totalQty} ${p.unit}</td>
            <td class="p-3 text-right font-semibold">Rp ${p.totalRevenue.toLocaleString()}</td>
            <td class="p-3 text-right font-bold text-indigo-700">Rp ${p.totalProfit.toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

function openFinancialDetail(type) {
    const titleElem = document.getElementById('fin-detail-title');
    const subElem = document.getElementById('fin-detail-sub');
    const bodyElem = document.getElementById('fin-detail-body');
    if (!bodyElem) return;
    bodyElem.innerHTML = '';

    const titles = {
        'TUNAI': 'Riwayat Uang Tunai / Kas Laci',
        'BANK': 'Riwayat Transfer / QRIS (Bank)',
        'PIUTANG': 'Riwayat Piutang & Transaksi Tempo',
        'PROFIT': 'Rincian Keuntungan (Profit Bersih)'
    };

    if (titleElem) titleElem.innerText = titles[type] || 'Rincian Keuangan';

    const validTrx = state.auditLog.filter(h => h.status !== 'VOID' && isTransactionInDateRange(h.date));
    let filteredList = [];

    if (type === 'TUNAI') {
        filteredList = validTrx.filter(h => h.method.includes('TUNAI'));
    } else if (type === 'BANK') {
        filteredList = validTrx.filter(h => h.method.includes('TRANSFER') || h.method.includes('QRIS'));
    } else if (type === 'PIUTANG') {
        filteredList = validTrx.filter(h => h.method.includes('TEMPO') || h.mode === 'PELUNASAN_PIUTANG');
    } else if (type === 'PROFIT') {
        filteredList = validTrx.filter(h => h.mode !== 'PELUNASAN_PIUTANG');
    }

    if (subElem) subElem.innerText = `Total ${filteredList.length} Transaksi | Adjustment: Rp ${(state.adjustments[type] || 0).toLocaleString()}`;

    if (filteredList.length === 0) {
        bodyElem.innerHTML = `<p class="text-center text-slate-400 py-6">Belum ada riwayat transaksi.</p>`;
    } else {
        filteredList.forEach(t => {
            const div = document.createElement('div');
            div.className = "p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center cursor-pointer hover:bg-slate-100 transition";
            div.onclick = () => reopenReceiptModal(t.id);
            
            let valDisplay = `Rp ${t.total.toLocaleString()}`;
            if (type === 'PROFIT') {
                let p = 0;
                if (t.items) {
                    t.items.forEach(i => p += ((i.price - (i.priceCost || 0)) * i.qty));
                }
                p -= (t.discount || 0);
                valDisplay = `Profit: Rp ${p.toLocaleString()}`;
            }

            div.innerHTML = `
                <div>
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-slate-800 hover:text-emerald-700">${t.id}</span>
                        <span class="text-[10px] text-slate-400">${t.date}</span>
                    </div>
                    <p class="text-[11px] text-slate-500">${t.customer} (${t.mode === 'PELUNASAN_PIUTANG' ? 'Pelunasan Utang' : t.mode})</p>
                </div>
                <div class="text-right font-bold text-emerald-700 text-xs">
                    ${valDisplay}
                </div>
            `;
            bodyElem.appendChild(div);
        });
    }

    const modal = document.getElementById('modal-financial-detail');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function openAdjustmentModal(type) {
    if (state.role !== 'OWNER') {
        alert("Akses Ditolak: Hanya OWNER yang diizinkan melakukan penyesuaian saldo!");
        return;
    }

    const typeLabels = {
        'TUNAI': 'Uang Tunai Fisik (Kas Laci)',
        'BANK': 'Uang Transfer / QRIS (Bank)',
        'PIUTANG': 'Total Piutang Berjalan',
        'PROFIT': 'Total Profit Bersih'
    };

    document.getElementById('adj-type').value = type;
    document.getElementById('adj-type-label').value = typeLabels[type] || type;
    document.getElementById('adj-amount').value = '';
    document.getElementById('adj-note').value = '';

    const modal = document.getElementById('modal-adjustment');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function voidTransaction(trxId) {
    if (state.role !== 'OWNER') {
        alert("Akses Ditolak: Hanya Owner yang diizinkan membatalkan nota!");
        return;
    }

    const targetLog = state.auditLog.find(h => h.id === trxId);
    if (!targetLog) return;

    if (targetLog.status === 'VOID') {
        alert("Transaksi ini sudah dibatalkan sebelumnya!");
        return;
    }

    if (confirm(`Yakin ingin membatalkan transaksi ${trxId}?`)) {
        if (targetLog.mode === 'PELUNASAN_PIUTANG') {
            const cust = state.customers.find(c => c.id === targetLog.customerId);
            if (cust) {
                cust.piutang += targetLog.total;
            }
        } else {
            if (targetLog.items && targetLog.items.length > 0) {
                targetLog.items.forEach(item => {
                    const prod = state.products.find(p => p.id === item.id);
                    if (prod) {
                        prod.stock += item.qty;
                    }
                });
            }

            if (targetLog.method.includes('TEMPO') && targetLog.customerId) {
                const cust = state.customers.find(c => c.id === targetLog.customerId);
                if (cust) {
                    cust.piutang = Math.max(0, cust.piutang - targetLog.total);
                }
            }
        }

        targetLog.status = 'VOID';
        
        const activeTrx = state.history.find(h => h.id === trxId);
        if (activeTrx) {
            activeTrx.status = 'VOID';
        }

        saveStateToStorage();
        renderAll();
        alert(`Transaksi ${trxId} berhasil dibatalkan.`);
    }
}

function initModals() {
    const modalProduct = document.getElementById('modal-add-product');
    const modalCust = document.getElementById('modal-edit-customer');
    const modalCustHistory = document.getElementById('modal-cust-history');
    const modalReceipt = document.getElementById('modal-receipt');
    const modalPaymentConfirm = document.getElementById('modal-payment-confirm');
    const modalFinDetail = document.getElementById('modal-financial-detail');
    const modalAdj = document.getElementById('modal-adjustment');

    const hideModal = (modal) => {
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    };

    const showModal = (modal) => {
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    };

    document.getElementById('btn-add-product')?.addEventListener('click', () => showModal(modalProduct));
    document.getElementById('close-modal-product')?.addEventListener('click', () => hideModal(modalProduct));
    document.getElementById('btn-cancel-product')?.addEventListener('click', () => hideModal(modalProduct));

    document.getElementById('form-add-product')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const newProduct = {
            id: 'P' + String(state.products.length + 1).padStart(2, '0'),
            name: document.getElementById('p-name').value,
            category: document.getElementById('p-category').value,
            unit: document.getElementById('p-unit').value,
            priceCost: parseFloat(document.getElementById('p-price-cost').value) || 0,
            priceRetail: parseFloat(document.getElementById('p-price-retail').value),
            priceGrosir: parseFloat(document.getElementById('p-price-grosir').value),
            stock: parseInt(document.getElementById('p-stock').value),
            expDate: document.getElementById('p-exp').value
        };

        state.products.push(newProduct);
        saveStateToStorage();
        
        hideModal(modalProduct);
        document.getElementById('form-add-product').reset();
        renderAll();
        alert("Produk berhasil ditambahkan & disimpan!");
    });

    document.getElementById('close-modal-cust')?.addEventListener('click', () => hideModal(modalCust));
    document.getElementById('btn-cancel-cust')?.addEventListener('click', () => hideModal(modalCust));
    document.getElementById('btn-add-customer')?.addEventListener('click', openAddCustomerModal);
    
    document.getElementById('form-edit-customer')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-cust-id').value;

        if (id) {
            const cust = state.customers.find(c => c.id === id);
            if (cust) {
                cust.name = document.getElementById('edit-cust-name').value;
                cust.phone = document.getElementById('edit-cust-phone').value;
                cust.limit = parseFloat(document.getElementById('edit-cust-limit').value);
                
                if (state.role === 'OWNER') {
                    const newPiutang = parseFloat(document.getElementById('edit-cust-piutang').value);
                    if (!isNaN(newPiutang)) {
                        cust.piutang = Math.max(0, newPiutang);
                    }
                }
            }
        } else {
            const newCust = {
                id: 'C' + String(state.customers.length).padStart(2, '0'),
                name: document.getElementById('edit-cust-name').value,
                phone: document.getElementById('edit-cust-phone').value,
                limit: parseFloat(document.getElementById('edit-cust-limit').value) || 10000000,
                piutang: 0
            };
            state.customers.push(newCust);
            state.currentCustomer = newCust;
        }

        saveStateToStorage();
        hideModal(modalCust);
        renderAll();
        alert("Data pelanggan berhasil disimpan!");
    });

    document.getElementById('close-modal-cust-history')?.addEventListener('click', () => hideModal(modalCustHistory));
    document.getElementById('btn-close-cust-history')?.addEventListener('click', () => hideModal(modalCustHistory));

    document.getElementById('close-modal-fin-detail')?.addEventListener('click', () => hideModal(modalFinDetail));
    document.getElementById('btn-close-fin-detail')?.addEventListener('click', () => hideModal(modalFinDetail));

    document.getElementById('close-modal-adj')?.addEventListener('click', () => hideModal(modalAdj));
    document.getElementById('btn-cancel-adj')?.addEventListener('click', () => hideModal(modalAdj));

    document.getElementById('form-adjustment')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const type = document.getElementById('adj-type').value;
        const action = document.getElementById('adj-action').value;
        const amount = parseFloat(document.getElementById('adj-amount').value) || 0;
        const note = document.getElementById('adj-note').value;

        if (!state.adjustments[type]) {
            state.adjustments[type] = 0;
        }

        if (action === 'ADD') {
            state.adjustments[type] += amount;
        } else if (action === 'SUBTRACT') {
            state.adjustments[type] -= amount;
        } else if (action === 'SET') {
            state.adjustments[type] = amount;
        }

        const adjId = generateNextTrxId('ADJ');
        state.auditLog.unshift({
            id: adjId,
            date: new Date().toLocaleString('id-ID'),
            mode: `ADJUSTMENT_${type}`,
            customerId: 'OWNER',
            customer: `Owner Adjustment (${note})`,
            total: amount,
            method: action,
            status: 'SUCCESS',
            operator: 'OWNER',
            items: []
        });

        saveStateToStorage();
        hideModal(modalAdj);
        renderAll();
        alert(`Penyesuaian nominal ${type} berhasil disimpan! (${adjId})`);
    });

    document.getElementById('btn-cancel-payment-modal')?.addEventListener('click', () => {
        hideModal(modalPaymentConfirm);
        state.pendingTransaction = null;
    });

    document.getElementById('btn-cancel-confirm')?.addEventListener('click', () => {
        hideModal(modalPaymentConfirm);
        state.pendingTransaction = null;
    });

    document.getElementById('btn-proceed-confirm')?.addEventListener('click', () => {
        document.getElementById('payment-step-1')?.classList.add('hidden');
        document.getElementById('payment-step-2')?.classList.remove('hidden');
    });

    document.getElementById('btn-back-step-1')?.addEventListener('click', () => {
        document.getElementById('payment-step-2')?.classList.add('hidden');
        document.getElementById('payment-step-1')?.classList.remove('hidden');
    });

    document.getElementById('btn-agree-final')?.addEventListener('click', finalizeCheckout);

    document.getElementById('btn-close-receipt')?.addEventListener('click', () => hideModal(modalReceipt));
    document.getElementById('btn-print-action')?.addEventListener('click', () => window.print());
}

function reopenReceiptModal(trxId) {
    const trx = state.auditLog.find(h => h.id === trxId) || state.history.find(h => h.id === trxId);
    if (!trx) {
        alert("Data transaksi tidak ditemukan!");
        return;
    }

    showReceiptModal(trx.id, trx.total, trx.method, trx.customer, trx.items, trx.date);
}

function showReceiptModal(trxId, total, method, customerName, items, dateStr = null) {
    document.getElementById('r-trx-id').innerText = trxId;
    document.getElementById('r-date').innerText = dateStr || new Date().toLocaleString('id-ID');
    document.getElementById('r-customer-name').innerText = customerName || 'Eceran / Umum';
    document.getElementById('r-total').innerText = 'Rp ' + total.toLocaleString();

    const bannerTempo = document.getElementById('r-tempo-banner');
    const methodElem = document.getElementById('r-method');

    if (method.includes('TEMPO')) {
        if (bannerTempo) bannerTempo.classList.remove('hidden');
        if (methodElem) {
            methodElem.innerText = 'TEMPO / HUTANG';
            methodElem.className = 'font-bold bg-rose-100 text-rose-800 px-1 rounded';
        }
    } else {
        if (bannerTempo) bannerTempo.classList.add('hidden');
        if (methodElem) {
            methodElem.innerText = method;
            methodElem.className = 'font-bold px-1 rounded';
        }
    }

    const rItems = document.getElementById('r-items');
    if (rItems) {
        rItems.innerHTML = '';

        if (items && items.length > 0) {
            items.forEach(item => {
                const div = document.createElement('div');
                div.className = "flex justify-between text-[11px]";
                div.innerHTML = `<span>${item.name} ${item.qty > 1 ? 'x' + item.qty : ''}</span><span>Rp ${(item.price * item.qty).toLocaleString()}</span>`;
                rItems.appendChild(div);
            });
        } else {
            rItems.innerHTML = `<p class="text-center text-slate-400 italic text-[10px]">Pelunasan Piutang / Non-Barang</p>`;
        }
    }

    const modalReceipt = document.getElementById('modal-receipt');
    if (modalReceipt) {
        modalReceipt.classList.remove('hidden');
        modalReceipt.classList.add('flex');
    }
}

function initReportExportControls() {
    document.getElementById('btn-apply-date-filter')?.addEventListener('click', () => {
        const start = document.getElementById('report-start-date').value;
        const end = document.getElementById('report-end-date').value;
        state.dateFilter.startDate = start || null;
        state.dateFilter.endDate = end || null;
        renderReports();
    });

    document.getElementById('btn-reset-date-filter')?.addEventListener('click', () => {
        document.getElementById('report-start-date').value = '';
        document.getElementById('report-end-date').value = '';
        state.dateFilter.startDate = null;
        state.dateFilter.endDate = null;
        renderReports();
    });

    document.getElementById('btn-export-excel')?.addEventListener('click', exportToExcel);
    document.getElementById('btn-export-pdf')?.addEventListener('click', exportToPDF);
    document.getElementById('input-import-data')?.addEventListener('change', importDataFile);
}

function exportToExcel() {
    if (typeof XLSX === 'undefined') {
        alert("Library Excel (SheetJS) belum dimuat dengan benar.");
        return;
    }

    const filteredLogs = state.auditLog.filter(h => isTransactionInDateRange(h.date));
    
    const summaryData = [
        ["LAPORAN KEUANGAN UD RUDY JAYA"],
        ["Periode Filter:", `${state.dateFilter.startDate || 'Awal'} s/d ${state.dateFilter.endDate || 'Sekarang'}`],
        ["Tanggal Cetak:", new Date().toLocaleString('id-ID')],
        [""],
        ["Kategori Keuangan", "Total Saldo (Rp)"],
        ["💵 Kas Tunai Laci", document.getElementById('report-cash-total')?.innerText || '0'],
        ["🏦 Bank / Transfer / QRIS", document.getElementById('report-bank-total')?.innerText || '0'],
        ["📜 Total Piutang Berjalan", document.getElementById('report-total-piutang')?.innerText || '0'],
        ["📈 Estimasi Profit Bersih", document.getElementById('report-total-profit')?.innerText || '0']
    ];

    const trxRows = [
        ["ID Nota", "Waktu", "Tipe", "Pelanggan", "Total Tagihan", "Metode", "Status"]
    ];

    filteredLogs.forEach(h => {
        trxRows.push([
            h.id,
            h.date,
            h.mode,
            h.customer,
            h.total,
            h.method,
            h.status
        ]);
    });

    const debtRows = [
        ["ID Pelanggan", "Nama Pelanggan", "No HP", "Limit Kredit (Rp)", "Sisa Piutang (Rp)"]
    ];

    state.customers.forEach(c => {
        if (c.id !== 'C00') {
            debtRows.push([c.id, c.name, c.phone, c.limit, c.piutang]);
        }
    });

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    const wsTrx = XLSX.utils.aoa_to_sheet(trxRows);
    const wsDebt = XLSX.utils.aoa_to_sheet(debtRows);

    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Keuangan");
    XLSX.utils.book_append_sheet(wb, wsTrx, "Riwayat Transaksi");
    XLSX.utils.book_append_sheet(wb, wsDebt, "Daftar Piutang");

    XLSX.writeFile(wb, `Laporan_Keuangan_RudyJaya_${Date.now()}.xlsx`);
}

function exportToPDF() {
    if (!window.jspdf) {
        alert("Library PDF (jsPDF) belum dimuat dengan benar.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("UD RUDY JAYA - LAPORAN KEUANGAN", 14, 15);
    doc.setFontSize(10);
    doc.text(`Periode: ${state.dateFilter.startDate || 'Awal'} s/d ${state.dateFilter.endDate || 'Sekarang'}`, 14, 22);
    doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 14, 27);

    const summaryHead = [["Kategori Keuangan", "Total Saldo"]];
    const summaryBody = [
        ["Kas Tunai (Laci)", document.getElementById('report-cash-total')?.innerText || '0'],
        ["Bank / Transfer / QRIS", document.getElementById('report-bank-total')?.innerText || '0'],
        ["Total Piutang Berjalan", document.getElementById('report-total-piutang')?.innerText || '0'],
        ["Total Profit Bersih", document.getElementById('report-total-profit')?.innerText || '0']
    ];

    doc.autoTable({
        startY: 32,
        head: summaryHead,
        body: summaryBody,
        theme: 'grid',
        headStyles: { fillColor: [4, 120, 87] }
    });

    const filteredLogs = state.auditLog.filter(h => isTransactionInDateRange(h.date));
    const trxHead = [["ID Nota", "Waktu", "Pelanggan", "Total", "Metode"]];
    const trxBody = filteredLogs.map(h => [h.id, h.date, h.customer, "Rp " + h.total.toLocaleString(), h.method]);

    doc.setFontSize(12);
    doc.text("Riwayat Transaksi Periode", 14, doc.lastAutoTable.finalY + 12);

    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 16,
        head: trxHead,
        body: trxBody,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save(`Laporan_RudyJaya_${Date.now()}.pdf`);
}

function importDataFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    if (file.name.endsWith('.json')) {
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.products) state.products = data.products;
                if (data.customers) state.customers = data.customers;
                if (data.history) state.history = data.history;
                if (data.auditLog) state.auditLog = data.auditLog;
                if (data.adjustments) state.adjustments = data.adjustments;
                if (data.lastTrxCounter) state.lastTrxCounter = data.lastTrxCounter;

                saveStateToStorage();
                renderAll();
                alert("Import Data JSON Berhasil!");
            } catch (err) {
                alert("Format file JSON tidak valid!");
            }
        };
        reader.readAsText(file);
    } else {
        alert("Format import file didukung melalui format .json cadangan sistem.");
    }
}