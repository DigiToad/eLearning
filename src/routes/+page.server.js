import Subscriber from '$lib/server/models/Subscribers.js';
import { error } from '@sveltejs/kit';

// export function load() {
//   throw error(404, 'Testing global 404');
// }
// import { getfeaturedProducts } from '$lib/server/mongoLoads.js';
// import FeaturedProducts from '$lib/server/models/Featured.js';
// export const load = async () => {
//     try {
//         const {  error } = await getfeaturedProducts();
//         const featuredProductsRaw = await FeaturedProducts.find({}).lean();
//         const featuredProducts = JSON.parse(JSON.stringify(featuredProductsRaw));
//         return {  error, featuredProducts };
//     } catch (error) {
//         console.error("Error in load:", error);
//         return {
//             featuredProducts: [],
//             error: "Unexpected error loading blogs"
//         };
//     }
// };

// import { getfeaturedProducts, geteventshome } from '$lib/server/mongoLoads.js';
// import FeaturedProducts from '$lib/server/models/Featured.js';

// export const load = async () => {
//     try {
//         const { error: featuredError } = await getfeaturedProducts();
//         const { eventslist, error: newsError } = await geteventshome(); // ← fixed key

//         const featuredProductsRaw = await FeaturedProducts.find({}).lean();
//         const featuredProducts = JSON.parse(JSON.stringify(featuredProductsRaw));

//         return {
//             featuredProducts,
//             eventslist: eventslist ?? [],  // ← correct key name
//             error: featuredError || newsError
//         };
//     } catch (error) {
//         console.error("Error in load:", error);
//         return {
//             featuredProducts: [],
//             eventslist: [],
//             error: "Unexpected error loading data"
//         };
//     }
// };
// export const load = async () => {
//     try {
//         // Call both load functions
//         const { error: featuredError } = await getfeaturedProducts();
//         const { data: newsData, error: newsError } = await geteventshome();

//         // Fetch featured products
//         const featuredProductsRaw = await FeaturedProducts.find({}).lean();
//         const featuredProducts = JSON.parse(JSON.stringify(featuredProductsRaw));

//         return {
//             featuredProducts,
//             newsData, // 👈 events/news added here
//             error: featuredError || newsError
//         };

//     } catch (error) {
//         console.error("Error in load:", error);

//         return {
//             featuredProducts: [],
//             newsData: [],
//             error: "Unexpected error loading data"
//         };
//     }
// };
export const actions = {
    subscribe: async ({ request }) => {
        try {
            const rawData = Object.fromEntries(await request.formData());
            const { email, name } = rawData;
            
            // Check if email already exists in DB
            const existingSubscriber = await Subscriber.findOne({ email });
            if (existingSubscriber) {
                return {
                    type: "error",
                    message: "This email is already subscribed!"
                };
            }
            
            // Store new subscriber in DB
            const newSubscriber = new Subscriber({ name, email });
            await newSubscriber.save();
            
            return {
                type: "success",
                message: "Subscribed successfully!"
            };
        } catch (error) {
            // console.error("Error submitting subscription:", error);
            return {
                type: "error",
                message: "Error submitting your data. Please try again later!"
            };
        }
    }
};
