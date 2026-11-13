/* Browser API helper. Set window.MYDIU_API_BASE before loading this file. */
(() => {
  const base = (window.MYDIU_API_BASE || 'http://localhost:4000/api/v1').replace(/\/$/, '');
  const key = 'mydiu_access_token';
  async function request(path, options = {}) {
    const token = sessionStorage.getItem(key);
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${base}${path}`, { ...options, headers });
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || `Request failed (${response.status})`);
    return data;
  }
  window.MYDIU = {
    apiBase: base,
    async register(data) { const r = await request('/auth/register',{method:'POST',body:JSON.stringify(data)}); sessionStorage.setItem(key,r.accessToken); return r; },
    async login(identifier,password) { const r = await request('/auth/login',{method:'POST',body:JSON.stringify({identifier,password})}); sessionStorage.setItem(key,r.accessToken); return r; },
    logout() { sessionStorage.removeItem(key); },
    me() { return request('/auth/me'); },
    categories() { return request('/categories'); },
    businesses(params={}) { return request(`/businesses?${new URLSearchParams(params)}`); },
    products(params={}) { return request(`/products?${new URLSearchParams(params)}`); },
    submitBusiness(data) { return request('/vendor/businesses',{method:'POST',body:JSON.stringify(data)}); },
    myBusiness() { return request('/vendor/business'); },
    sellerSubscription() { return request('/vendor/subscription'); },
    createSellerSubscriptionOrder() { return request('/vendor/subscription/checkout',{method:'POST'}); },
    verifySellerSubscription(data) { return request('/vendor/subscription/verify',{method:'POST',body:JSON.stringify(data)}); },
    addProduct(data) { return request('/vendor/products',{method:'POST',body:JSON.stringify(data)}); },
    myProducts() { return request('/vendor/products'); },
    updateProduct(id,data) { return request(`/vendor/products/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(data)}); },
    deleteProduct(id) { return request(`/vendor/products/${encodeURIComponent(id)}`,{method:'DELETE'}); },
    vendorOrders() { return request('/vendor/orders'); },
    updateVendorOrder(id,status) { return request(`/vendor/orders/${id}/status`,{method:'PATCH',body:JSON.stringify({status})}); },
    cart() { return request('/cart'); },
    addCartItem(productId,quantity=1) { return request('/cart/items',{method:'POST',body:JSON.stringify({productId,quantity})}); },
    updateCartItem(id,quantity) { return request(`/cart/items/${id}`,{method:'PATCH',body:JSON.stringify({quantity})}); },
    removeCartItem(id) { return request(`/cart/items/${id}`,{method:'DELETE'}); },
    checkoutQuote() { return request('/checkout/quote',{method:'POST'}); },
    createCheckout(data) { return request('/checkout/create',{method:'POST',body:JSON.stringify(data)}); },
    orders() { return request('/orders'); },
    order(id) { return request(`/orders/${id}`); },
    deliveryJobs() { return request('/delivery/jobs'); },
    acceptDelivery(id) { return request(`/delivery/jobs/${id}/accept`,{method:'PATCH'}); },
    updateDeliveryStatus(id,status) { return request(`/delivery/jobs/${id}/status`,{method:'PATCH',body:JSON.stringify({status})}); },
    adminOverview() { return request('/admin/overview'); },
    pendingBusinesses() { return request('/admin/businesses/pending'); },
    adminOrders() { return request('/admin/orders'); },
    assignOperationalRole(userId,role) { return request(`/admin/users/${userId}/role`,{method:'PATCH',body:JSON.stringify({role})}); },
    decideBusiness(id,decision) { return request(`/admin/businesses/${id}/decision`,{method:'PATCH',body:JSON.stringify({decision})}); }
  };
})();
