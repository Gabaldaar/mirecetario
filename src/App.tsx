import { useState, useEffect, useMemo } from 'react';
import { db, auth } from './firebase/config';
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  orderBy 
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { Recipe, Favorite, MasterIngredient, MenuItem, CollaborativeMenu, Ingredient } from './types';
import { AuthPage } from './components/AuthPage';
import { RecipeCard } from './components/RecipeCard';
import { RecipeDetail } from './components/RecipeDetail';
import { RecipeForm } from './components/RecipeForm';
import { PantrySearch } from './components/PantrySearch';
import { EquivalenciasModal } from './components/EquivalenciasModal';
import { MenuPlanner } from './components/MenuPlanner';
import { IngredientsManagerModal } from './components/IngredientsManagerModal';
import { 
  ChefHat, 
  Search, 
  Heart, 
  LogOut, 
  Plus, 
  UtensilsCrossed, 
  BookOpen, 
  Loader2,
  Scale,
  Sun,
  Moon,
  Settings,
  AlertCircle,
  ShoppingBag
} from 'lucide-react';

function App() {
  // Estado de Autenticación
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Estado de Datos
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(true);

  // Estado de Navegación y Búsqueda
  const [activeTab, setActiveTab] = useState<'explore' | 'pantry' | 'favorites' | 'menu'>('explore');
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showEquivalences, setShowEquivalences] = useState(false);
  const [showIngredientsManager, setShowIngredientsManager] = useState(false);

  // Estado de Ingredientes Master y Menú Colaborativo
  const [masterIngredients, setMasterIngredients] = useState<MasterIngredient[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [checkedIngredients, setCheckedIngredients] = useState<string[]>([]);
  const [customIngredients, setCustomIngredients] = useState<Ingredient[]>([]);
  const [overrides, setOverrides] = useState<Record<string, { quantity: number; isDeleted?: boolean }>>({});
  
  // Estado del Tema
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  // Filtros de búsqueda local
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedCuisine, setSelectedCuisine] = useState('Todas');
  const [selectedDifficulty, setSelectedDifficulty] = useState('Todas');

  // Estado para la notificación flotante (Toast)
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-limpieza del Toast después de 2.5 segundos
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Estado para diálogos y confirmaciones personalizados
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  } | null>(null);

  const handleShowAlert = (title: string, message: string) => {
    setDialogConfig({
      isOpen: true,
      type: 'alert',
      title,
      message,
      confirmText: 'Aceptar',
      onConfirm: () => setDialogConfig(null)
    });
  };

  const handleShowConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    isDestructive = false
  ) => {
    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      confirmText: isDestructive ? 'Eliminar' : 'Confirmar',
      cancelText: 'Cancelar',
      onConfirm: () => {
        onConfirm();
        setDialogConfig(null);
      },
      isDestructive
    });
  };

  // Monitorizar cambios en la autenticación del usuario
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const isRegistering = sessionStorage.getItem('is_registering') === 'true';
        if (isRegistering) {
          // Bypasar la redirección inmediata para dar tiempo a la asignación de displayName
          return;
        }
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // Escuchar Recetas en tiempo real desde Firestore (offline-persistente)
  useEffect(() => {
    if (!currentUser) return;

    setRecipesLoading(true);
    const q = query(collection(db, 'recipes'), orderBy('name', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Recipe[] = [];
      snapshot.forEach((doc) => {
        items.push({ ...doc.data() } as Recipe);
      });
      setRecipes(items);
      setRecipesLoading(false);
    }, (error) => {
      console.error("Error cargando recetas:", error);
      setRecipesLoading(false);
    });

    return unsubscribe;
  }, [currentUser]);

  // Escuchar Favoritos del usuario actual en tiempo real
  useEffect(() => {
    if (!currentUser) {
      setFavorites([]);
      return;
    }

    const q = query(collection(db, 'favorites'), where('userId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Favorite[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as Favorite);
      });
      setFavorites(items);
    }, (error) => {
      console.error("Error cargando favoritos:", error);
    });

    return unsubscribe;
  }, [currentUser]);

  // Escuchar ingredientes maestros
  useEffect(() => {
    if (!currentUser) {
      setMasterIngredients([]);
      return;
    }

    const unsubscribe = onSnapshot(collection(db, 'ingredients'), (snapshot) => {
      const items: MasterIngredient[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as MasterIngredient);
      });
      setMasterIngredients(items);
    }, (error) => {
      console.error("Error cargando ingredientes maestros:", error);
    });

    return unsubscribe;
  }, [currentUser]);

  // Escuchar menú colaborativo en tiempo real
  useEffect(() => {
    if (!currentUser) {
      setMenuItems([]);
      setCheckedIngredients([]);
      setCustomIngredients([]);
      setOverrides({});
      return;
    }

    const docRef = doc(db, 'menus', 'collaborative');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as CollaborativeMenu;
        setMenuItems(data.items || []);
        setCheckedIngredients(data.checkedIngredients || []);
        setCustomIngredients(data.customIngredients || []);
        setOverrides(data.overrides || {});
      } else {
        setMenuItems([]);
        setCheckedIngredients([]);
        setCustomIngredients([]);
        setOverrides({});
      }
    }, (error) => {
      console.error("Error cargando menú colaborativo:", error);
    });

    return unsubscribe;
  }, [currentUser]);

  // Guardar menú colaborativo en Firestore con actualizaciones optimistas instantáneas
  const updateCollaborativeMenu = async (
    newItems: MenuItem[], 
    newChecked?: string[],
    newCustom?: Ingredient[],
    newOverrides?: Record<string, { quantity: number; isDeleted?: boolean }>
  ) => {
    setMenuItems(newItems);
    if (newChecked !== undefined) setCheckedIngredients(newChecked);
    if (newCustom !== undefined) setCustomIngredients(newCustom);
    
    // Si cambia el listado de recetas o porciones de forma externa (sin pasar newOverrides), reseteamos los overrides
    const itemsChanged = JSON.stringify(newItems) !== JSON.stringify(menuItems);
    const overridesToSave = newOverrides !== undefined 
      ? newOverrides 
      : (itemsChanged ? {} : overrides);
    
    setOverrides(overridesToSave);

    try {
      const docRef = doc(db, 'menus', 'collaborative');
      await setDoc(docRef, {
        id: 'collaborative',
        items: newItems,
        checkedIngredients: newChecked !== undefined ? newChecked : checkedIngredients,
        customIngredients: newCustom !== undefined ? newCustom : customIngredients,
        overrides: overridesToSave,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error al actualizar menú colaborativo:", err);
    }
  };

  // Agregar receta directamente al menú desde Explorar o Detalle
  const handleAddRecipeToMenu = (recipe: Recipe) => {
    const exists = menuItems.find(item => item.recipeId === recipe.id);
    let updated: MenuItem[];
    if (exists) {
      updated = menuItems.map(item => 
        item.recipeId === recipe.id 
          ? { ...item, servings: item.servings + 2 }
          : item
      );
    } else {
      updated = [...menuItems, {
        recipeId: recipe.id,
        recipeName: recipe.name,
        servings: recipe.servings || 4
      }];
    }
    updateCollaborativeMenu(updated);
    setToastMessage(`"${recipe.name}" agregada a la lista de compras.`);
  };

  // Sincronizar el Tema en el HTML/Body
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
      document.body.classList.add('theme-light');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.remove('theme-light');
      document.body.classList.remove('theme-light');
      localStorage.setItem('theme', 'dark');
    }
  }, [theme]);

  // Cerrar Sesión
  const handleLogout = () => {
    handleShowConfirm(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas cerrar tu sesión en Mi Recetario?',
      () => {
        signOut(auth);
        setCurrentRecipe(null);
        setIsEditing(false);
        setIsCreating(false);
      }
    );
  };

  // Alternar Favorito
  const handleToggleFavorite = async (recipeId: string, recipeName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser) return;

    const favoriteId = `${currentUser.uid}_${recipeId}`;
    const favoriteDocRef = doc(db, 'favorites', favoriteId);
    const exists = favorites.some(fav => fav.recipeId === recipeId);

    try {
      if (exists) {
        // Remover favorito
        await deleteDoc(favoriteDocRef);
      } else {
        // Agregar favorito
        const newFav: Favorite = {
          id: favoriteId,
          userId: currentUser.uid,
          recipeId: recipeId,
          recipeName: recipeName,
          createdAt: new Date().toISOString()
        };
        await setDoc(favoriteDocRef, newFav);
      }
    } catch (error) {
      console.error("Error al gestionar favorito:", error);
    }
  };

  // Crear o guardar cambios en una receta
  const handleRecipeSubmit = async (recipeData: Omit<Recipe, 'id' | 'createdBy' | 'createdByName' | 'createdAt'>) => {
    if (!currentUser) return;

    // Si estamos editando
    if (isEditing && currentRecipe) {
      const recipeDocRef = doc(db, 'recipes', currentRecipe.id);
      const updatedRecipe: Recipe = {
        ...currentRecipe,
        ...recipeData,
        // Mantener autor original
      };
      try {
        await setDoc(recipeDocRef, updatedRecipe);
        setCurrentRecipe(updatedRecipe);
        setIsEditing(false);
      } catch (err) {
        console.error("Error al actualizar receta:", err);
      }
    } else {
      // Si estamos creando una nueva
      const newId = `rec_${Date.now()}`;
      const recipeDocRef = doc(db, 'recipes', newId);
      const newRecipe: Recipe = {
        id: newId,
        ...recipeData,
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName || 'Usuario Colaborativo',
        createdAt: new Date().toISOString()
      };
      try {
        await setDoc(recipeDocRef, newRecipe);
        setCurrentRecipe(newRecipe);
        setIsCreating(false);
      } catch (err) {
        console.error("Error al crear receta:", err);
      }
    }
  };

  // Eliminar receta
  const handleRecipeDelete = () => {
    if (!currentRecipe || !currentUser) return;
    handleShowConfirm(
      'Eliminar Receta',
      `¿Estás seguro de que quieres eliminar la receta "${currentRecipe.name}"?`,
      async () => {
        try {
          await deleteDoc(doc(db, 'recipes', currentRecipe.id));
          
          // Limpiar favorito si existe
          await deleteDoc(doc(db, 'favorites', `${currentUser.uid}_${currentRecipe.id}`));
          
          setCurrentRecipe(null);
          setIsEditing(false);
        } catch (err) {
          console.error("Error al eliminar receta:", err);
        }
      },
      true // Es una acción destructiva
    );
  };

  // Filtrado local de recetas en el explorador
  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.ingredients.some(ing => ing.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'Todas' || recipe.category === selectedCategory;
    const matchesCuisine = selectedCuisine === 'Todas' || recipe.cuisine === selectedCuisine;
    const matchesDifficulty = selectedDifficulty === 'Todas' || recipe.difficulty === selectedDifficulty;

    return matchesSearch && matchesCategory && matchesCuisine && matchesDifficulty;
  });

  const hasActiveFilters = searchQuery !== '' || selectedCategory !== 'Todas' || selectedCuisine !== 'Todas' || selectedDifficulty !== 'Todas';

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('Todas');
    setSelectedCuisine('Todas');
    setSelectedDifficulty('Todas');
  };

  // Categorías, Cocinas y Dificultades dinámicas extraídas del recetario
  const categoriesList = useMemo(() => {
    return ['Todas', ...Array.from(new Set(recipes.map(r => r.category).filter(Boolean)))].sort();
  }, [recipes]);

  const cuisinesList = useMemo(() => {
    return ['Todas', ...Array.from(new Set(recipes.map(r => r.cuisine).filter(Boolean)))].sort();
  }, [recipes]);

  const difficultiesList = ['Todas', 'Muy fácil', 'Fácil', 'Intermedia', 'Difícil'];

  // Si está cargando el Auth del usuario
  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg-app flex flex-col items-center justify-center text-text-secondary gap-4">
        <Loader2 className="w-10 h-10 text-teal-400 animate-spin" />
        <span className="text-sm font-semibold tracking-wider">Cargando aplicación...</span>
      </div>
    );
  }

  // Si no está autenticado, mostrar página de login
  if (!currentUser) {
    return <AuthPage onAuthSuccess={() => setCurrentUser(auth.currentUser ? { ...auth.currentUser } : null)} />;
  }

  return (
    <div className="min-h-screen bg-bg-app text-text-primary flex flex-col justify-between font-sans print:min-h-0 print:bg-white">
      
      {/* HEADER PRINCIPAL */}
      <header className="sticky top-0 z-40 bg-bg-app/80 border-b border-border-app backdrop-blur-md print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setCurrentRecipe(null); setIsCreating(false); setIsEditing(false); }}>
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-text-primary font-heading">Mi Recetario</h1>
              <span className="text-[10px] text-teal-accent font-bold tracking-widest uppercase">Colaborativo</span>
            </div>
          </div>

          {/* Perfil de Usuario y Logout */}
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-block text-xs font-semibold text-text-secondary">
              Hola, <span className="text-teal-accent">{currentUser.displayName || 'Cocinero'}</span>
            </span>
            <button
              onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? "Modo Claro" : "Modo Oscuro"}
              className="p-2.5 rounded-xl bg-bg-input-half border border-border-app text-text-secondary hover:text-amber-400 hover:bg-bg-card transition cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowIngredientsManager(true)}
              title="Administrar Ingredientes"
              className="p-2 px-3 rounded-xl bg-bg-input-half border border-border-app text-text-secondary hover:text-teal-accent hover:bg-bg-card transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden md:inline">Ingredientes</span>
            </button>
            <button
              onClick={() => setShowEquivalences(true)}
              title="Tabla de Equivalencias"
              className="p-2.5 rounded-xl bg-bg-input-half border border-border-app text-text-secondary hover:text-teal-accent hover:bg-bg-card transition cursor-pointer"
            >
              <Scale className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="p-2.5 rounded-xl bg-bg-input-half border border-border-app text-text-secondary hover:text-text-primary hover:bg-bg-card transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* CUERPO PRINCIPAL DE LA APLICACIÓN */}
      <main className="flex-1 pb-24 print:pb-0">
        
        {/* MODO EDICIÓN / CREACIÓN */}
        {isCreating || isEditing ? (
          <RecipeForm 
            recipe={isEditing && currentRecipe ? currentRecipe : undefined}
            allRecipes={recipes}
            masterIngredients={masterIngredients}
            onSubmit={handleRecipeSubmit}
            onCancel={() => { setIsCreating(false); setIsEditing(false); }}
            onShowEquivalences={() => setShowEquivalences(true)}
            onManageIngredients={() => setShowIngredientsManager(true)}
          />
        ) : currentRecipe ? (
          /* VISTA DETALLE */
          <RecipeDetail 
            recipe={currentRecipe}
            isFavorite={favorites.some(fav => fav.recipeId === currentRecipe.id)}
            currentUserUid={currentUser.uid}
            onBack={() => setCurrentRecipe(null)}
            onEdit={() => setIsEditing(true)}
            onDelete={handleRecipeDelete}
            onToggleFavorite={(id, name) => handleToggleFavorite(id, name)}
            onShowEquivalences={() => setShowEquivalences(true)}
            onAddToMenu={handleAddRecipeToMenu}
          />
        ) : (
          /* LISTADOS GENERALES */
          <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 text-text-primary">
            
            {/* TABS DE SECCIÓN */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 border-b border-border-app pb-3 print:hidden">
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setActiveTab('explore')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
                    activeTab === 'explore' 
                      ? 'bg-teal-accent/10 text-teal-accent border border-teal-accent/20' 
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Explorar</span>
                </button>
                <button
                  onClick={() => setActiveTab('pantry')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
                    activeTab === 'pantry' 
                      ? 'bg-teal-accent/10 text-teal-accent border border-teal-accent/20' 
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <UtensilsCrossed className="w-4 h-4" />
                  <span>Por Despensa</span>
                </button>
                <button
                  onClick={() => setActiveTab('favorites')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
                    activeTab === 'favorites' 
                      ? 'bg-teal-accent/10 text-teal-accent border border-teal-accent/20' 
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  <span>Favoritos ({favorites.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('menu')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
                    activeTab === 'menu' 
                      ? 'bg-teal-accent/10 text-teal-accent border border-teal-accent/20' 
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Lista de compras ({menuItems.length})</span>
                </button>
              </div>

              {/* Botón Crear Receta */}
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-teal-accent text-bg-app hover:opacity-90 text-xs font-bold transition cursor-pointer shadow-lg shadow-teal-500/10 w-full sm:w-auto shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Nueva Receta</span>
              </button>
            </div>

            {/* CONTENIDOS DE TAB */}
            {activeTab === 'explore' && (
              <div className="space-y-6">
                {/* Buscador y Filtros Alineados con Etiquetas */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-bg-input-half/35 border border-border-app p-4 rounded-2xl items-end">
                  {/* Input de Búsqueda */}
                  <div className="md:col-span-5">
                    <label className="block text-[10px] text-text-secondary uppercase tracking-wider mb-1.5 px-1 font-bold">Buscar Receta</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary">
                        <Search className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por receta o ingrediente..."
                        className="block w-full pl-9 pr-3 py-2 border border-border-app rounded-xl bg-bg-input text-text-primary placeholder-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-teal-accent/20 text-xs"
                      />
                    </div>
                  </div>

                  {/* Filtro Categoría */}
                  <div className="md:col-span-3">
                    <label className="block text-[10px] text-text-secondary uppercase tracking-wider mb-1.5 px-1 font-bold">Categoría</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="block w-full px-3 py-2 border border-border-app rounded-xl bg-bg-input text-text-primary focus:outline-none text-xs cursor-pointer"
                    >
                      {categoriesList.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro Cocina/Origen */}
                  <div className="md:col-span-2">
                    <label className="block text-[10px] text-text-secondary uppercase tracking-wider mb-1.5 px-1 font-bold">Cocina / Origen</label>
                    <select
                      value={selectedCuisine}
                      onChange={(e) => setSelectedCuisine(e.target.value)}
                      className="block w-full px-3 py-2 border border-border-app rounded-xl bg-bg-input text-text-primary focus:outline-none text-xs cursor-pointer"
                    >
                      {cuisinesList.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro Dificultad */}
                  <div className="md:col-span-2">
                    <label className="block text-[10px] text-text-secondary uppercase tracking-wider mb-1.5 px-1 font-bold">Dificultad</label>
                    <select
                      value={selectedDifficulty}
                      onChange={(e) => setSelectedDifficulty(e.target.value)}
                      className="block w-full px-3 py-2 border border-border-app rounded-xl bg-bg-input text-text-primary focus:outline-none text-xs cursor-pointer"
                    >
                      {difficultiesList.map(dif => (
                        <option key={dif} value={dif}>{dif}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Contador de Resultados y Limpiar Filtros */}
                <div className="flex justify-between items-center text-xs text-text-secondary px-1">
                  <span>
                    Se encontraron <strong className="text-teal-accent font-mono text-sm">{filteredRecipes.length}</strong> recetas
                  </span>
                  {hasActiveFilters && (
                    <button
                      onClick={handleClearFilters}
                      className="text-teal-accent hover:opacity-85 font-semibold transition cursor-pointer"
                    >
                      Limpiar Filtros
                    </button>
                  )}
                </div>

                {/* Listado de Recetas */}
                {recipesLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-text-secondary gap-3">
                    <Loader2 className="w-8 h-8 text-teal-accent animate-spin" />
                    <span className="text-xs">Buscando recetas en Firestore...</span>
                  </div>
                ) : filteredRecipes.length === 0 ? (
                  <div className="text-center py-20 border border-dashed border-border-app rounded-2xl bg-bg-input-half/10 space-y-2">
                    <BookOpen className="w-10 h-10 text-text-secondary/50 mx-auto" />
                    <h3 className="text-sm font-semibold text-text-secondary">No se encontraron recetas</h3>
                    <p className="text-xs text-text-secondary/70">Prueba con otra búsqueda o cambia los filtros de categoría.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {filteredRecipes.map(recipe => (
                      <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        isFavorite={favorites.some(fav => fav.recipeId === recipe.id)}
                        onToggleFavorite={(id, name, ev) => handleToggleFavorite(id, name, ev)}
                        onClick={() => setCurrentRecipe(recipe)}
                        onAddToMenu={handleAddRecipeToMenu}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'pantry' && (
              <PantrySearch 
                recipes={recipes}
                onRecipeClick={(recipe) => setCurrentRecipe(recipe)}
              />
            )}

            {activeTab === 'favorites' && (
              <div className="space-y-6 text-text-primary">
                <div className="space-y-1">
                  <h2 className="text-xl font-extrabold text-text-primary font-heading">Mis Recetas Favoritas</h2>
                  <p className="text-xs text-text-secondary">Acceso rápido a las recetas marcadas con corazón.</p>
                </div>

                {favorites.length === 0 ? (
                  <div className="text-center py-20 border border-dashed border-border-app rounded-2xl bg-bg-input-half/10 space-y-2">
                    <Heart className="w-10 h-10 text-text-secondary/50 mx-auto" />
                    <h3 className="text-sm font-semibold text-text-secondary">Aún no tienes favoritos</h3>
                    <p className="text-xs text-text-secondary/70">Haz clic en el corazón de cualquier receta para guardarla aquí.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {recipes
                      .filter(recipe => favorites.some(fav => fav.recipeId === recipe.id))
                      .map(recipe => (
                        <RecipeCard
                          key={recipe.id}
                          recipe={recipe}
                          isFavorite={true}
                          onToggleFavorite={(id, name, ev) => handleToggleFavorite(id, name, ev)}
                          onClick={() => setCurrentRecipe(recipe)}
                          onAddToMenu={handleAddRecipeToMenu}
                        />
                      ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'menu' && (
              <MenuPlanner
                menuItems={menuItems}
                checkedIngredients={checkedIngredients}
                customIngredients={customIngredients}
                overrides={overrides}
                recipes={recipes}
                masterIngredients={masterIngredients}
                onUpdateMenu={updateCollaborativeMenu}
                onRecipeClick={(recipe) => setCurrentRecipe(recipe)}
                showAlert={handleShowAlert}
                showConfirm={handleShowConfirm}
                showToast={(msg) => setToastMessage(msg)}
              />
            )}

          </div>
        )}
      </main>

      {/* FOOTER PIE DE PÁGINA */}
      <footer className="bg-bg-app border-t border-border-app py-6 text-center text-xs text-text-secondary print:hidden">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Mi Recetario Colaborativo e Inteligente. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <span className="flex items-center gap-1 text-[10px] bg-teal-500/5 text-teal-400 border border-teal-500/10 px-2.5 py-0.5 rounded-full font-bold">
              Firestore Offline Activo
            </span>
          </div>
        </div>
      </footer>

      {/* MODAL DE EQUIVALENCIAS */}
      {showEquivalences && (
        <EquivalenciasModal onClose={() => setShowEquivalences(false)} />
      )}

      {/* MODAL DE INGREDIENTES */}
      {showIngredientsManager && (
        <IngredientsManagerModal 
          onClose={() => setShowIngredientsManager(false)} 
          masterIngredients={masterIngredients}
          showAlert={handleShowAlert}
          showConfirm={handleShowConfirm}
        />
      )}

      {/* DIÁLOGO / CONFIRMACIÓN PERSONALIZADO */}
      {dialogConfig && dialogConfig.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-bg-card border border-border-app rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col relative text-text-primary animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-3">
              {dialogConfig.isDestructive ? (
                <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-rose-accent" />
                </div>
              ) : dialogConfig.type === 'confirm' ? (
                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-purple-accent" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-teal-accent" />
                </div>
              )}
              <h3 className="text-lg font-bold font-heading text-text-primary">{dialogConfig.title}</h3>
            </div>
            
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              {dialogConfig.message}
            </p>

            <div className="flex justify-end gap-3">
              {dialogConfig.type === 'confirm' && (
                <button
                  onClick={() => setDialogConfig(null)}
                  className="px-4 py-2.5 bg-bg-input-half hover:bg-bg-card text-text-secondary hover:text-text-primary border border-border-app/50 rounded-xl transition font-medium text-xs cursor-pointer"
                >
                  {dialogConfig.cancelText || 'Cancelar'}
                </button>
              )}
              <button
                onClick={dialogConfig.onConfirm}
                className={`px-5 py-2.5 rounded-xl transition font-bold text-xs cursor-pointer ${
                  dialogConfig.isDestructive 
                    ? 'bg-rose-accent text-white hover:opacity-90 animate-pulse' 
                    : 'bg-teal-accent text-bg-app hover:opacity-90'
                }`}
              >
                {dialogConfig.confirmText || 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICACIÓN FLOTANTE (TOAST) DE CONFIRMACIÓN */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-teal-accent text-bg-app font-black text-xs shadow-2xl flex items-center gap-2 border border-teal-accent/30 animate-in fade-in slide-in-from-bottom duration-300">
          <div className="w-1.5 h-1.5 rounded-full bg-bg-app animate-ping"></div>
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}

export default App;
