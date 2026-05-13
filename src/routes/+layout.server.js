
// import { redirect } from '@sveltejs/kit';
// import Profile from '$lib/server/models/Profile.js';
// import Products from '$lib/server/models/Component.js';

// export const load = async ({ url, cookies, locals, depends }) => {
//   try {
//     if (url.pathname === '/logout') {
//       cookies.delete('token', { path: '/' });
//       redirect(302, '/signin');
//     }
    
//     depends("data:load");
    
//     // Fetch products first (available to all users)
//     const products = await Products.find({}, {
//       category: 1,
//       subcategory :1,
//       title: 1,
//       producturl: 1,
//       _id: 0
//     }).lean();
    
//     const productsList = products.map(product => ({
//       category: product.category || '',
//       subcategory :product.subcategory || '',
//       title: product.title || '',
//       url: product.producturl || ''
//     }));
    
//     // If user is not authenticated, return only products
//     if (!locals?.user) {
//       return {
//         authedUser: null,
//         error: 'Not authenticated',
//         products: productsList,
//       };
//     }
    
//     const authedUser = { id: locals.user.userId };
//     const userProfile = await Profile.findOne({ userId: authedUser.id });
    
//     // If profile not found, return only products
//     if (!userProfile) {
//       return {
//         authedUser: null,
//         error: 'Profile not found',
//         products: productsList,
//       };
//     }
    
//     const finalResult = JSON.parse(JSON.stringify({ profile: userProfile }));
    
//     // Return everything for authenticated users with profile
//     return {
//       authedUser: {
//         id: authedUser.id,
//         firstname: userProfile.firstName || '',
//         email: userProfile.email || '',
//         phone: userProfile.cellPhone || '',
//       },
//       profile: finalResult.profile,
//       products: productsList,
//     };
//   } catch (error) {
//     console.error('Load function error:', error);
    
//     // Even on error, try to return products if possible
//     try {
//       const products = await Products.find({}, {
//         category: 1,
//         title: 1,
//         producturl: 1,
//         _id: 0
//       }).lean();
      
//       const productsList = products.map(product => ({
//         category: product.category || '',
//         title: product.title || '',
//         url: product.producturl || ''
//       }));
      
//       return {
//         authedUser: null,
//         error: 'Failed to load data',
//         products: productsList,
//       };
//     } catch (productError) {
//       return {
//         authedUser: null,
//         error: 'Failed to load data',
//         products: [],
//       };
//     }
//   }
// };


// import { redirect } from '@sveltejs/kit';
// import Profile from '$lib/server/models/Profile.js';
// import Products from '$lib/server/models/Component.js';
// import Category from '$lib/server/models/Category.js'; 

// export const load = async ({ url, cookies, locals, depends }) => {
  
//   const fetchProducts = async () => {
//     const [products, categories] = await Promise.all([
//       Products.find({}, {
//         category: 1,
//         subcategory: 1,
//         title: 1,
//         producturl: 1,
//         Categoryorder: 1, 
//         image : 1,
//         _id: 0
//       }).lean(),
//       Category.find({}, {
//         _id: 1,
//         order: 1
//       }).lean()
//     ]);

//     const categoryOrderMap = Object.fromEntries(
//       categories.map(cat => [cat._id.toString(), cat.order])
//     );

//     return products
//       .map(product => ({
//         category: product.category || '',
//         subcategory: product.subcategory || '',
//         title: product.title || '',
//         url: product.producturl || '',
//         image:product.image || '',
//         _sortOrder: categoryOrderMap[product.Categoryorder] ?? Infinity 
//       }))
//       .sort((a, b) => a._sortOrder - b._sortOrder)
//       .map(({ _sortOrder, ...rest }) => rest);
//   };

//   try {
//     if (url.pathname === '/logout') {
//       cookies.delete('token', { path: '/' });
//       redirect(302, '/signin');
//     }

//     depends("data:load");

//     const productsList = await fetchProducts();

//     if (!locals?.user) {
//       return {
//         authedUser: null,
//         error: 'Not authenticated',
//         products: productsList,
//       };
//     }

//     const authedUser = { id: locals.user.userId };
//     const userProfile = await Profile.findOne({ userId: authedUser.id });

//     if (!userProfile) {
//       return {
//         authedUser: null,
//         error: 'Profile not found',
//         products: productsList,
//       };
//     }

//     const finalResult = JSON.parse(JSON.stringify({ profile: userProfile }));

//     return {
//       authedUser: {
//         id: authedUser.id,
//         firstname: userProfile.firstName || '',
//         email: userProfile.email || '',
//         phone: userProfile.cellPhone || '',
//       },
//       profile: finalResult.profile,
//       products: productsList,
//     };

//   } catch (error) {
//     // console.error('Load function error:', error);

//     try {
//       const productsList = await fetchProducts();
//       return { authedUser: null, error: 'Failed to load data', products: productsList };
//     } catch (productError) {
//       return { authedUser: null, error: 'Failed to load data', products: [] };
//     }
//   }
// };