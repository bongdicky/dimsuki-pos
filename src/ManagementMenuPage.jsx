import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, X, Check, Save, AlertCircle, LogOut } from 'lucide-react';
import { supabase } from './lib/supabase';
import { useAuth } from './AuthContext';

export default function ManagementMenuPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [newCategory, setNewCategory] = useState('');

  // Form state for add/edit menu
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    emoji: '🥟',
    variants: [{ size: '', price: '' }]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (categoriesError) throw categoriesError;

      // Fetch menu items with variants
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select(`
          *,
          category:categories(id, name),
          variants:menu_variants(*)
        `)
        .order('name');
      if (menuError) throw menuError;

      setCategories(categoriesData || []);
      setMenuItems(menuData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Gagal memuat data menu.');
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Add variant to form
  const addVariant = () => {
    setFormData({
      ...formData,
      variants: [...formData.variants, { size: '', price: '' }]
    });
  };

  // Remove variant from form
  const removeVariant = (index) => {
    const newVariants = formData.variants.filter((_, i) => i !== index);
    setFormData({ ...formData, variants: newVariants });
  };

  // Update variant in form
  const updateVariant = (index, field, value) => {
    const newVariants = [...formData.variants];
    newVariants[index][field] = value;
    setFormData({ ...formData, variants: newVariants });
  };

  // Save new menu
  const handleSaveMenu = async () => {
    try {
      // Validation
      if (!formData.name || !formData.category_id) {
        alert('Nama menu dan kategori harus diisi!');
        return;
      }

      const validVariants = formData.variants.filter(v => v.size && v.price);
      if (validVariants.length === 0) {
        alert('Minimal harus ada 1 varian dengan ukuran dan harga!');
        return;
      }

      console.log('Saving menu with data:', formData);

      // Insert menu item
      const { data: menuItem, error: menuError } = await supabase
        .from('menu_items')
        .insert([{
          name: formData.name,
          category_id: formData.category_id,
          emoji: formData.emoji,
          is_available: true
        }])
        .select()
        .single();

      if (menuError) {
        console.error('Menu insert error:', menuError);
        alert(`Error saat menyimpan menu: ${menuError.message}`);
        return;
      }

      console.log('Menu item created:', menuItem);

      // Insert variants
      const variantsToInsert = validVariants.map(v => ({
        menu_item_id: menuItem.id,
        size: v.size,
        price: parseInt(v.price)
      }));

      console.log('Inserting variants:', variantsToInsert);

      const { data: variants, error: variantsError } = await supabase
        .from('menu_variants')
        .insert(variantsToInsert)
        .select();

      if (variantsError) {
        console.error('Variants insert error:', variantsError);
        alert(`Error saat menyimpan varian: ${variantsError.message}`);
        return;
      }

      console.log('Variants created:', variants);

      alert('Menu berhasil ditambahkan!');
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving menu:', error);
      alert('Gagal menyimpan menu. Silakan coba lagi.');
    }
  };

  // Update existing menu
  const handleUpdateMenu = async () => {
    try {
      if (!formData.name || !formData.category_id) {
        alert('Nama menu dan kategori harus diisi!');
        return;
      }

      const validVariants = formData.variants.filter(v => v.size && v.price);
      if (validVariants.length === 0) {
        alert('Minimal harus ada 1 varian dengan ukuran dan harga!');
        return;
      }

      console.log('Updating menu:', editingMenu.id);

      // Update menu item
      const { data: updatedMenu, error: menuError } = await supabase
        .from('menu_items')
        .update({
          name: formData.name,
          category_id: formData.category_id,
          emoji: formData.emoji
        })
        .eq('id', editingMenu.id)
        .select();

      if (menuError) {
        console.error('Menu update error:', menuError);
        alert(`Error saat update menu: ${menuError.message}`);
        return;
      }

      console.log('Menu updated:', updatedMenu);

      // Delete old variants
      const { error: deleteError } = await supabase
        .from('menu_variants')
        .delete()
        .eq('menu_item_id', editingMenu.id);

      if (deleteError) {
        console.error('Delete variants error:', deleteError);
        alert(`Error saat hapus varian lama: ${deleteError.message}`);
        return;
      }

      console.log('Old variants deleted');

      // Insert new variants
      const variantsToInsert = validVariants.map(v => ({
        menu_item_id: editingMenu.id,
        size: v.size,
        price: parseInt(v.price)
      }));

      const { data: newVariants, error: variantsError } = await supabase
        .from('menu_variants')
        .insert(variantsToInsert)
        .select();

      if (variantsError) {
        console.error('Insert variants error:', variantsError);
        alert(`Error saat tambah varian baru: ${variantsError.message}`);
        return;
      }

      console.log('New variants inserted:', newVariants);

      alert('Menu berhasil diupdate!');
      setShowEditModal(false);
      setEditingMenu(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error updating menu:', error);
      alert('Gagal update menu. Silakan coba lagi.');
    }
  };

  // Delete menu
  const handleDeleteMenu = async (menuId, menuName) => {
    if (!confirm(`Yakin ingin menghapus menu "${menuName}"?`)) {
      return;
    }

    try {
      console.log('Deleting menu:', menuId);

      const { data, error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', menuId)
        .select();

      if (error) {
        console.error('Delete menu error:', error);
        alert(`Error saat hapus menu: ${error.message}`);
        return;
      }

      console.log('Menu deleted:', data);
      alert('Menu berhasil dihapus!');
      fetchData();
    } catch (error) {
      console.error('Error deleting menu:', error);
      alert('Gagal menghapus menu. Silakan coba lagi.');
    }
  };

  // Toggle menu availability
  const toggleAvailability = async (menuId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !currentStatus })
        .eq('id', menuId);

      if (error) throw error;

      fetchData();
    } catch (error) {
      console.error('Error toggling availability:', error);
      alert('Gagal mengubah status menu.');
    }
  };

  // Open edit modal
  const openEditModal = (menu) => {
    setEditingMenu(menu);
    setFormData({
      name: menu.name,
      category_id: menu.category.id,
      emoji: menu.emoji || '🥟',
      variants: menu.variants.map(v => ({ size: v.size, price: v.price.toString() }))
    });
    setShowEditModal(true);
  };

  // Add new category
  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      alert('Nama kategori tidak boleh kosong!');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name: newCategory.trim() }])
        .select();

      if (error) {
        console.error('Supabase error:', error);
        alert(`Error: ${error.message}`);
        return;
      }

      console.log('Category added:', data);
      alert('Kategori berhasil ditambahkan!');
      setNewCategory('');
      setShowCategoryModal(false);
      fetchData();
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Gagal menambahkan kategori. Silakan coba lagi.');
    }
  };

  // Delete category
  const handleDeleteCategory = async (categoryId, categoryName) => {
    if (!confirm(`Yakin ingin menghapus kategori "${categoryName}"? Menu dalam kategori ini akan ikut terhapus!`)) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        alert(`Error: ${error.message}`);
        return;
      }

      console.log('Category deleted:', data);
      alert('Kategori berhasil dihapus!');
      fetchData();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Gagal menghapus kategori. Silakan coba lagi.');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      category_id: '',
      emoji: '🥟',
      variants: [{ size: '', price: '' }]
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/kasir')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Management Menu</h1>
                <p className="text-sm text-gray-600">Kelola menu & kategori</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCategoryModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors text-sm md:text-base"
              >
                Kelola Kategori
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden md:inline">Tambah Menu</span>
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Menu List */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuItems.map(menu => (
            <div key={menu.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{menu.emoji || '🥟'}</div>
                  <div>
                    <h3 className="font-bold text-gray-800">{menu.name}</h3>
                    <p className="text-xs text-gray-500">{menu.category.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleAvailability(menu.id, menu.is_available)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    menu.is_available
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {menu.is_available ? 'Tersedia' : 'Habis'}
                </button>
              </div>

              <div className="space-y-1 mb-3">
                {menu.variants.map(variant => (
                  <div key={variant.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">{variant.size}</span>
                    <span className="font-semibold text-gray-800">{formatRupiah(variant.price)}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(menu)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteMenu(menu.id, menu.name)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>

        {menuItems.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Belum ada menu. Tambahkan menu pertama Anda!</p>
          </div>
        )}
      </div>

      {/* Add Menu Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">Tambah Menu Baru</h3>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nama Menu</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Dimsum Original"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Pilih Kategori</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emoji/Icon</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.emoji}
                      onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="🥟">🥟 Dimsum</option>
                      <option value="🍤">🍤 Goreng</option>
                      <option value="🦐">🦐 Udang</option>
                      <option value="🍜">🍜 Kuah/Mie</option>
                      <option value="🧋">🧋 Es Teh</option>
                      <option value="🍊">🍊 Jeruk</option>
                      <option value="☕">☕ Kopi/Teh</option>
                      <option value="🥤">🥤 Minuman</option>
                      <option value="🌶️">🌶️ Pedas</option>
                      <option value="🧈">🧈 Saus</option>
                      <option value="🍱">🍱 Paket</option>
                      <option value="🎁">🎁 Special</option>
                    </select>
                    <div className="w-16 h-10 border border-gray-300 rounded-lg flex items-center justify-center text-3xl bg-gray-50">
                      {formData.emoji}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Pilih emoji untuk menu Anda</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Varian</label>
                  {formData.variants.map((variant, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={variant.size}
                        onChange={(e) => updateVariant(index, 'size', e.target.value)}
                        placeholder="Ukuran (Isi 4, Isi 6, dll)"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <input
                        type="number"
                        value={variant.price}
                        onChange={(e) => updateVariant(index, 'price', e.target.value)}
                        placeholder="Harga"
                        className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      {formData.variants.length > 1 && (
                        <button
                          onClick={() => removeVariant(index)}
                          className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addVariant}
                    className="flex items-center gap-2 text-orange-600 hover:text-orange-700 text-sm font-medium mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Varian
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveMenu}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
                >
                  <Save className="w-5 h-5" />
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Menu Modal */}
      {showEditModal && editingMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">Edit Menu</h3>
                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nama Menu</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emoji/Icon</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.emoji}
                      onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="🥟">🥟 Dimsum</option>
                      <option value="🍤">🍤 Goreng</option>
                      <option value="🦐">🦐 Udang</option>
                      <option value="🍜">🍜 Kuah/Mie</option>
                      <option value="🧋">🧋 Es Teh</option>
                      <option value="🍊">🍊 Jeruk</option>
                      <option value="☕">☕ Kopi/Teh</option>
                      <option value="🥤">🥤 Minuman</option>
                      <option value="🌶️">🌶️ Pedas</option>
                      <option value="🧈">🧈 Saus</option>
                      <option value="🍱">🍱 Paket</option>
                      <option value="🎁">🎁 Special</option>
                    </select>
                    <div className="w-16 h-10 border border-gray-300 rounded-lg flex items-center justify-center text-3xl bg-gray-50">
                      {formData.emoji}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Varian</label>
                  {formData.variants.map((variant, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={variant.size}
                        onChange={(e) => updateVariant(index, 'size', e.target.value)}
                        placeholder="Ukuran"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <input
                        type="number"
                        value={variant.price}
                        onChange={(e) => updateVariant(index, 'price', e.target.value)}
                        placeholder="Harga"
                        className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      {formData.variants.length > 1 && (
                        <button
                          onClick={() => removeVariant(index)}
                          className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addVariant}
                    className="flex items-center gap-2 text-orange-600 hover:text-orange-700 text-sm font-medium mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Varian
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleUpdateMenu}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
                >
                  <Save className="w-5 h-5" />
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">Kelola Kategori</h3>
                <button onClick={() => setShowCategoryModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tambah Kategori Baru</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Nama kategori"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                  />
                  <button
                    onClick={handleAddCategory}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Kategori Tersedia</label>
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-800">{cat.name}</span>
                    <button
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowCategoryModal(false)}
                className="w-full mt-6 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}