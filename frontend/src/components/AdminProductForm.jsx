import { useState } from 'react';
import { addProduct, updateProduct, deleteProduct, productImage } from '../api';
import { useLanguage } from '../context/LanguageContext';

const emptyForm = { name: '', price: '', buying_price: '', category: '', description: '', stock: '' };
const QUICK_CATEGORIES = [
  'Complément Alimentaire',
  'Pack Complément Alimentaire',
  'Cosmétique Bio et Naturel',
  'Pack Cosmétique',
  'Make up',
  'Parfums',
];

export default function AdminProductForm({ products, categories, onChange }) {
  const { t, dict, lang } = useLanguage();
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  function startEdit(product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      price: product.price,
      buying_price: product.buying_price || '',
      category: product.category,
      description: product.description || '',
      stock: product.stock,
    });
    setImageFile(null);
    setImagePreview(productImage(product));
    setStatus({ state: 'idle', message: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview(null);
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    setImageFile(file || null);
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('price', form.price);
      fd.append('buying_price', form.buying_price || 0);
      fd.append('category', form.category);
      fd.append('description', form.description);
      fd.append('stock', form.stock || 0);
      if (imageFile) fd.append('image', imageFile);

      if (editingId) {
        await updateProduct(editingId, fd);
        setStatus({
          state: 'success',
          message: lang === 'ar' ? 'تم تحديث المنتج بنجاح.' : 'Produit mis à jour avec succès.',
        });
      } else {
        await addProduct(fd);
        setStatus({
          state: 'success',
          message: lang === 'ar' ? 'تمت إضافة المنتج إلى الكتالوج.' : 'Produit ajouté au catalogue.',
        });
      }
      resetForm();
      onChange();
    } catch (err) {
      const msg = err?.response?.data?.error || (lang === 'ar' ? 'حدث خطأ ما.' : 'Une erreur est survenue.');
      setStatus({ state: 'error', message: msg });
    }
  }

  async function handleDelete(id) {
    const confirmMsg = lang === 'fr'
      ? 'Supprimer ce produit ? Cette action est irréversible.'
      : 'Delete this product? This cannot be undone.';
    if (!window.confirm(confirmMsg)) return;
    await deleteProduct(id);
    onChange();
  }

  return (
    <div>
      <form className="admin-form" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {editingId
              ? (lang === 'fr' ? 'Modifier le Produit' : 'Edit Product')
              : (lang === 'fr' ? 'Ajouter un Nouveau Produit' : 'Add New Product')}
          </h3>
          {editingId && (
            <button type="button" className="clear-btn" onClick={resetForm}>
              {lang === 'ar' ? 'إلغاء التعديل' : 'Annuler la modification'}
            </button>
          )}
        </div>

        <div className="admin-form-grid">
          <div className="form-group full">
            <label>{lang === 'ar' ? 'اسم المنتج (مثال: سيروم النضارة والترطيب)' : 'Nom du Produit (ex: Sérum Éclat Hydra)'}</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Luxe Rose Eau de Parfum"
            />
          </div>

          <div className="form-group">
            <label>{lang === 'ar' ? 'سعر البيع (دج)' : 'Prix de Vente en DZD'}</label>
            <input
              type="number"
              min="0"
              step="1"
              required
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="e.g. 3500"
            />
          </div>

          <div className="form-group">
            <label>{lang === 'ar' ? 'سعر الشراء / التكلفة (دج)' : 'Prix d’Achat (Coût) en DZD'}</label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.buying_price}
              onChange={(e) => setForm({ ...form, buying_price: e.target.value })}
              placeholder="e.g. 1800"
            />
            <span style={{ fontSize: '11px', color: '#71717a' }}>
              {lang === 'fr'
                ? 'Utilisé pour les rapports de marge — jamais affiché aux clients.'
                : 'Used for profit reporting only — never shown to customers.'}
            </span>
          </div>

          <div className="form-group">
            <label>{lang === 'ar' ? 'الكمية في المخزون (قطع)' : 'Quantité en Stock (Unités)'}</label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              placeholder="e.g. 25"
            />
          </div>

          <div className="form-group full">
            <label>{lang === 'ar' ? 'القسم / الفئة' : 'Catégorie / Rayon'}</label>
            <input
              required
              list="category-suggestions"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="e.g. Skincare, Fragrance, Haircare, Bath & Body"
            />
            <datalist id="category-suggestions">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {/* Quick Category Buttons */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
              {QUICK_CATEGORIES.map((qc) => {
                const label = dict?.home?.departments?.categories?.[qc] || qc;
                return (
                  <button
                    key={qc}
                    type="button"
                    onClick={() => setForm({ ...form, category: qc })}
                    style={{
                      fontSize: '10.5px',
                      padding: '3px 8px',
                      borderRadius: '9999px',
                      background: form.category === qc ? '#000' : '#f4f4f5',
                      color: form.category === qc ? '#fff' : '#000',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                    }}
                  >
                    + {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group full">
            <label>{lang === 'ar' ? 'الوصف والمميزات' : 'Description & Bienfaits'}</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={lang === 'ar' ? 'صف المكونات، الفوائد وطريقة الاستخدام...' : 'Décrivez les actifs, bienfaits et conseils d’utilisation...'}
            />
          </div>

          <div className="form-group full">
            <label>
              {lang === 'fr'
                ? `Image du Produit ${editingId ? '(laisser vide pour conserver l’image actuelle)' : ''}`
                : `Product Image ${editingId ? '(leave empty to keep current image)' : ''}`}
            </label>
            <input type="file" accept="image/*" onChange={handleFileChange} />
            {imagePreview && (
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e5e5e7' }}
                />
                <span style={{ fontSize: '11.5px', color: '#71717a' }}>{lang === 'ar' ? 'معاينة الصورة' : 'Aperçu de l’image'}</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <button type="submit" className="btn btn-green" disabled={status.state === 'loading'}>
            {status.state === 'loading'
              ? (lang === 'ar' ? 'جارٍ الحفظ...' : 'Enregistrement...')
              : editingId
                ? (lang === 'ar' ? 'تحديث المنتج' : 'Mettre à jour le Produit')
                : (lang === 'ar' ? 'إضافة إلى الكتالوج' : 'Ajouter au Catalogue')}
          </button>
          {editingId && (
            <button type="button" className="btn btn-outline-dark" onClick={resetForm}>
              {lang === 'ar' ? 'إلغاء' : 'Annuler'}
            </button>
          )}
        </div>

        {status.message && (
          <p className={`form-msg ${status.state === 'success' ? 'success' : 'error'}`}>
            {status.message}
          </p>
        )}
      </form>

      {/* Catalog Table */}
      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>{lang === 'ar' ? 'الصورة' : 'Photo'}</th>
              <th>{lang === 'ar' ? 'اسم المنتج' : 'Nom du Produit'}</th>
              <th>{lang === 'ar' ? 'القسم' : 'Catégorie'}</th>
              <th>{lang === 'ar' ? 'سعر البيع' : 'Prix'}</th>
              <th>{lang === 'ar' ? 'التكلفة / الهامش' : 'Coût / Marge'}</th>
              <th>{lang === 'ar' ? 'المخزون' : 'Stock'}</th>
              <th style={{ textAlign: 'right' }}>{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const img = productImage(p);
              const cost = p.buying_price || 0;
              const margin = (p.price || 0) - cost;
              const catName = dict?.home?.departments?.categories?.[p.category] || p.category;
              return (
                <tr key={p.id}>
                  <td>
                    {img ? (
                      <img
                        src={img}
                        alt={p.name}
                        style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: '4px' }}
                      />
                    ) : (
                      <div style={{ width: 44, height: 44, background: '#f6f6f6', borderRadius: '4px' }} />
                    )}
                  </td>
                  <td style={{ fontWeight: '700' }}>{p.name}</td>
                  <td>
                    <span className="badge">{catName}</span>
                  </td>
                  <td style={{ fontWeight: '700' }}>{Number(p.price).toLocaleString('en-US')} DZD</td>
                  <td style={{ fontSize: '12px' }}>
                    {cost > 0 ? (
                      <>
                        <div style={{ color: '#71717a' }}>{lang === 'ar' ? 'التكلفة:' : 'Coût :'} {cost.toLocaleString('en-US')} DZD</div>
                        <div style={{ fontWeight: '700', color: margin >= 0 ? '#15803d' : '#b91c1c' }}>
                          {lang === 'ar' ? 'الهامش:' : 'Marge :'} {margin.toLocaleString('en-US')} DZD
                        </div>
                      </>
                    ) : (
                      <span style={{ color: '#b45309' }}>{lang === 'ar' ? 'لم تُحدد التكلفة' : 'Aucun coût défini'}</span>
                    )}
                  </td>
                  <td>
                    <span style={{ color: p.stock > 0 ? '#15803d' : '#b91c1c', fontWeight: '700' }}>
                      {p.stock > 0
                        ? (lang === 'fr' ? `${p.stock} en stock` : `${p.stock} in stock`)
                        : (lang === 'fr' ? 'Rupture de stock' : 'Out of stock')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="icon-btn" onClick={() => startEdit(p)}>
                      {lang === 'ar' ? 'تعديل' : 'Modifier'}
                    </button>
                    <button className="icon-btn danger" onClick={() => handleDelete(p.id)}>
                      {lang === 'ar' ? 'حذف' : 'Supprimer'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="empty-state">
            {lang === 'ar' ? 'لا توجد منتجات في الكتالوج بعد.' : 'Aucun produit dans le catalogue.'}
          </div>
        )}
      </div>
    </div>
  );
}

