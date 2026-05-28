// import Contactus from '$lib/server/models/Contact.js';
// import Events from '$lib/server/models/Events.js';
// import Products from '$lib/server/models/Component.js'
// import Partners from '$lib/server/models/Partners';
import User from '$lib/server/models/User.js'
// import Oems from '$lib/server/models/Oem.js'
// import Productdemo from '$lib/server/models/Productdemo.js'
// import Quote from '$lib/server/models/Quoteform.js'
// import Collab from '$lib/server/models/Collaborator.js';
// import Category from '$lib/server/models/Category.js'
// import WebinarFeedback from '$lib/server/models/Feedback.js';
import { error } from '@sveltejs/kit';
import { Course, CourseDraft } from '$lib/server/models/Courses.js';
import { Courseinfo } from '$lib/server/models/Courseinfo.js';
import { Section } from "$lib/server/models/Section.js";
// export async function fetchCourseinfo() {
//   try {
//     const records = await Courseinfo.find().lean();

//     return { records };
//   } catch (error) {
//     console.error("Failed to load CourseInfo:", error);

//     return {
//       records: [],
//       totalCount: 0
//     };
//   }
// }
// course.service.js

// import { Courseinfo } from "$lib/server/models/Courseinfo.js";
// import { Section } from "$lib/server/models/Section.js";

export async function fetchCourseinfo() {
  try {

    const courses = await Courseinfo.find({ status: "published" }).lean();
    const sections = await Section.find().lean();
    const records = courses.map((course) => {
      const matchedSections = sections.find(
        (sec) => sec.courseId === course.courseId
      );
      return {
        ...course,
        sections: matchedSections?.sections || []
      };
    });
    return {
      records,
      totalCount: records.length
    };
  } catch (error) {
    console.error("Failed to load CourseInfo:", error);
    return {
      records: [],
      totalCount: 0
    };
  }
}

export async function fetchCourses(currentPage, search, filter) {
  if (!filter) {
    filter = "unread";
  }
  let page = currentPage || 1
  let pageSize = 10
  let dataFilter = {}
  // if (search) {
  //   dataFilter.$or = [
  //     { name: { $regex: search, $options: "i" } },
  //     { email: { $regex: search, $options: "i" } },
  //     { company: { $regex: search, $options: "i" } }]
  // }
  if (filter !== "all") {
    dataFilter.status = filter;
  }
  const records = JSON.parse(JSON.stringify(await Course.find(dataFilter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize)));
  const totalCount = JSON.parse(JSON.stringify(await Course.countDocuments(dataFilter)))
  return { records, totalCount };
}

// export const getAllProducts = async () => {
//   try {
//     const allBlogsRaw = await Products.find();
//     const allBlogs = allBlogsRaw.map(blog => ({
//       id: blog._id.toString(),
//       category: blog.category,
//       title: blog.title,
//       subtitle: blog.subtitle,
//       description: blog.description,
//       overview: blog.overview,
//       features: blog.features,
//       applications: blog.applications,
//       image: blog.image,
//       keywords :blog.keywords,
//       subcategory : blog.subcategory,
//     }));

//     const totalCount = allBlogs.length;

//     return { 
//       allBlogs, 
//       totalCount 
//     };
//   } catch (error) {
//     console.error("Error fetching Products:", error);
//     return {
//       message: "Failed to fetch Products",
//       allBlogs: [],
//       totalCount: 0
//     };
//   }
// };


export const getAllProducts = async () => {
  try {
    // Fetch products
    const allBlogsRaw = await Products.find();

    const allBlogs = allBlogsRaw.map(blog => ({
      id: blog._id.toString(),
      category: blog.category, // unchanged
      title: blog.title,
      subtitle: blog.subtitle,
      description: blog.description,
      overview: blog.overview,
      features: blog.features,
      applications: blog.applications,
      image: blog.image,
      keywords: blog.keywords,
      subcategory: blog.subcategory,
    }));

    // Fetch categories SEPARATELY
    const allCategoryRaw = await Category.find().sort({ order: 1 });

    const allCategory = allCategoryRaw.map(cat => ({
      id: cat._id.toString(),
      title: cat.title,
      order: cat.order
    }));

    const totalCount = allBlogs.length;

    return {
      allBlogs,
      allCategory, // ✅ separate
      totalCount
    };
  } catch (error) {
    console.error("Error fetching Products:", error);
    return {
      message: "Failed to fetch Products",
      allBlogs: [],
      allCategory: [],
      totalCount: 0
    };
  }
};

export const getAllCategories = async () => {
  try {
    const categories = await Products.find().sort({ name: 1 });
    console.log('-----mongo categories---', categories);
    return categories;
  } catch (error) {
    console.error('Error loading categories:', error);
    return {
      categories: [],
      error: 'Failed to load categories'
    };
  }
};
export async function getprodustsdata(currentPage, search, filter) {
  //   console.log("currentPage", currentPage);
  //    console.log("search in server", search);
  //    console.log("filter in server", filter);
  let page = currentPage || 1
  let pageSize = 12
  let dataFilter = {}
  if (search) {
    dataFilter.$or = [
      { title: { $regex: search, $options: "i" } },
      { Keyword: { $regex: search, $options: "i" } }
    ]
  } else if (filter && filter !== "all") {
    dataFilter.status = filter
  }

  const records = JSON.parse(JSON.stringify(await Products.find(dataFilter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize)));
  const totalCount = JSON.parse(JSON.stringify(await Products.countDocuments(dataFilter)))
  //   console.log("records",records);
  return { records, totalCount };
}
export async function getNewsData(currentPage = 1) {
  const pageSize = 12;
  const now = new Date();

  // Build a filter that accounts for endTime stored separately
  // We fetch all and split in JS since endTime is a separate field
  const allRecords = JSON.parse(
    JSON.stringify(await Events.find({}).sort({ startDate: -1 }))
  );

  // Split upcoming vs past using both endDate + endTime
  const getEndDateTime = (event) => {
    const end = new Date(event.endDate);
    if (event.endTime) {
      const [h, m] = event.endTime.split(':').map(Number);
      end.setHours(h, m, 0, 0);
    } else {
      end.setHours(23, 59, 59, 999);
    }
    return end;
  };

  const upcoming = allRecords.filter((e) => getEndDateTime(e) >= now);
  const past = allRecords.filter((e) => getEndDateTime(e) < now);

  // Sort upcoming ascending, past descending
  upcoming.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  past.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

  // Paginate past events
  const pastTotalCount = past.length;
  const pastRecords = past.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return {
    upcomingRecords: upcoming,
    pastRecords,
    pastTotalCount
  };
}
// export async function getNewsData(currentPage = 1) {
//   const pageSize = 12;
//   const now = new Date();

//   // Fetch ALL upcoming events (no pagination)
//   const upcomingRecords = JSON.parse(
//     JSON.stringify(
//       await Events.find({ endDate: { $gte: now } }).sort({ startDate: 1 })
//     )
//   );

//   // Fetch ONLY past events with pagination
//   const pastRecords = JSON.parse(
//     JSON.stringify(
//       await Events.find({ endDate: { $lt: now } })
//         .sort({ startDate: -1 })
//         .skip((currentPage - 1) * pageSize)
//         .limit(pageSize)
//     )
//   );

//   const pastTotalCount = await Events.countDocuments({ endDate: { $lt: now } });

//   return { upcomingRecords, pastRecords, pastTotalCount };
// }
// export async function getNewsData(currentPage, search, filter) {
//   //   console.log("currentPage", currentPage);
//   //    console.log("search in server", search);
//   //    console.log("filter in server", filter);
//   let page = currentPage || 1
//   let pageSize = 12
//   let dataFilter = {}
//   if (search) {
//     dataFilter.$or = [
//       { title: { $regex: search, $options: "i" } },
//       { Keyword: { $regex: search, $options: "i" } }
//     ]
//   } else if (filter && filter !== "all") {
//     dataFilter.status = filter
//   }

//   const records = JSON.parse(JSON.stringify(await Events.find(dataFilter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize)));
//   const totalCount = JSON.parse(JSON.stringify(await Events.countDocuments(dataFilter)))
//   //   console.log("records",records);
//   return { records, totalCount };
// }
export async function getSingleNewsData(link) {
  console.log(link, "linkkkkkkkkkkk");

  const records = await Events.findOne({ newsLink: link });
  // console.log("Fetched records:", records);
  if (records) {
    return records;
  } else {
    
    throw error(500, 'News data not found');
  }
}
export async function eventslist(currentPage, search, filter) {
  let page = currentPage || 1
  let pageSize = 10
  let dataFilter = {}
  if (search) {
    dataFilter.$or = [
      { title: { $regex: search, $options: "i" } },
      { Keyword: { $regex: search, $options: "i" } }]
  } else if (filter && filter !== "all") {
    dataFilter.status = filter
  }
  const records = JSON.parse(JSON.stringify(await Events.find(dataFilter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize)));
  const totalCount = JSON.parse(JSON.stringify(await Events.countDocuments(dataFilter)))
  return { records, totalCount };
}

export async function newsroom(currentPage, search, filter) {
  let page = currentPage || 1
  let pageSize = 10
  let dataFilter = {}
  if (search) {
    dataFilter.$or = [
      { title: { $regex: search, $options: "i" } },
      { Keywords: { $regex: search, $options: "i" } }]
  } else if (filter && filter !== "all") {
    dataFilter.status = filter
  }
  const records = JSON.parse(JSON.stringify(await Events.find(dataFilter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize)));
  const totalCount = JSON.parse(JSON.stringify(await Events.countDocuments(dataFilter)))
  return { records, totalCount };
}

export const getAllpartners = async () => {
  try {
    const allBlogsRaw = await Partners.find();

    const allBlogs = allBlogsRaw.map(blog => ({
      id: blog._id.toString(),
      title: blog.title,
      content: blog.content,
      image: blog.image,
      location: blog.location,
      partnertype: blog.partnertype,
      url: blog.url,
      order: blog.order,
    }));

    return { allBlogs };
  } catch (error) {
    console.error("Error fetching Blogs:", error);
    return {
      message: "Failed to fetch Blogs",
    };
  }
};

export const getAllCategory = async () => {
  try {
    const allBlogsRaw = await Category.find();

    const allBlogs = allBlogsRaw.map(blog => ({
      id: blog._id.toString(),
      title: blog.title,
      order: blog.order,
    }));

    return { allBlogs };
  } catch (error) {
    console.error("Error fetching Blogs:", error);
    return {
      message: "Failed to fetch Blogs",
    };
  }
};
export async function getpartnerssdata(currentPage, search, filter) {
  //   console.log("currentPage", currentPage);
  //    console.log("search in server", search);
  //    console.log("filter in server", filter);
  let page = currentPage || 1
  let pageSize = 12
  let dataFilter = {}
  if (search) {
    dataFilter.$or = [
      { title: { $regex: search, $options: "i" } },
      { Keyword: { $regex: search, $options: "i" } }
    ]
  } else if (filter && filter !== "all") {
    dataFilter.status = filter
  }

  const records = JSON.parse(JSON.stringify(await Partners.find(dataFilter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize)));
  const totalCount = JSON.parse(JSON.stringify(await Partners.countDocuments(dataFilter)))
  //   console.log("records",records);
  return { records, totalCount };
}

export async function usersdata(currentPage, search, filter) {
  //   console.log("currentPage", currentPage);
  //    console.log("search in server", search);
  //    console.log("filter in server", filter);
  let page = currentPage || 1
  let pageSize = 12
  let dataFilter = {}
  if (search) {
    dataFilter.$or = [
      { title: { $regex: search, $options: "i" } },
      { Keyword: { $regex: search, $options: "i" } }
    ]
  } else if (filter && filter !== "all") {
    dataFilter.status = filter
  }

  const records = JSON.parse(JSON.stringify(await User.find(dataFilter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize)));
  const totalCount = JSON.parse(JSON.stringify(await User.countDocuments(dataFilter)))
  //   console.log("records",records);
  return { records, totalCount };
}
export async function Oemsload(currentPage, search, filter) {
  let page = currentPage || 1
  let pageSize = 10
  let dataFilter = {}
  if (search) {
    dataFilter.$or = [
      { title: { $regex: search, $options: "i" } },
    ]
  } else if (filter && filter !== "all") {
    dataFilter.status = filter
  }
  const records = JSON.parse(JSON.stringify(await Oems.find(dataFilter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize)));
  const totalCount = JSON.parse(JSON.stringify(await Oems.countDocuments(dataFilter)))
  return { records, totalCount };
}

export async function fetchProductdemo(currentPage, search, filter) {
  if (!filter) {
    filter = "unread";
  }
  let page = currentPage || 1
  let pageSize = 10
  let dataFilter = {}
  if (search) {
    dataFilter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { company: { $regex: search, $options: "i" } }]
  }
  if (filter !== "all") {
    dataFilter.status = filter;
  }
  const records = JSON.parse(JSON.stringify(await Productdemo.find(dataFilter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize)));
  const totalCount = JSON.parse(JSON.stringify(await Productdemo.countDocuments(dataFilter)))
  return { records, totalCount };
}

export async function fetchQuoterequest(currentPage, search, filter) {
  if (!filter) {
    filter = "unread";
  }
  let page = currentPage || 1
  let pageSize = 10
  let dataFilter = {}
  if (search) {
    dataFilter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { company: { $regex: search, $options: "i" } }]
  }
  if (filter !== "all") {
    dataFilter.status = filter;
  }
  const records = JSON.parse(JSON.stringify(await Quote.find(dataFilter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize)));
  const totalCount = JSON.parse(JSON.stringify(await Quote.countDocuments(dataFilter)))
  return { records, totalCount };
}

export async function getSingleprodctdata(link) {
  console.log(link, "linkkkkkkkkkkk");

  const records = await Products.findOne({ producturl: link });
  // console.log("Fetched records:", records);
  if (records) {
    return records;
  } else {
    return { error: 'Product data not found' };
  }
}

export const getCollaborators = async () => {
  try {
    const collaborator = await Collab.find().lean(); // Use .lean() for plain objects
    console.log('-----mongo categories---', collaborator);

    // Process images to ensure they're arrays
    const processedData = collaborator.map(collab => ({
      ...collab,
      image: typeof collab.image === 'string'
        ? collab.image.split(',').map(img => img.trim())
        : Array.isArray(collab.image)
          ? collab.image
          : [collab.image]
    }));

    return processedData;
  } catch (error) {
    console.error('Error loading categories:', error);
    return [];  // Return empty array directly
  }
};




export const getfeaturedProducts = async () => {
  try {
    // Fetch products
    const allBlogsRaw = await Products.find();

    const allBlogs = allBlogsRaw.map(blog => ({
      id: blog._id.toString(),
      category: blog.category, // unchanged
      title: blog.title,
      description: blog.description,
      image: blog.image,
      keywords: blog.keywords,
      producturl : blog.producturl
      
    }));



    const totalCount = allBlogs.length;

    return {
      allBlogs,
      totalCount
    };
  } catch (error) {
    console.error("Error fetching Products:", error);
    return {
      message: "Failed to fetch Products",
      allBlogs: [],
      allCategory: [],
      totalCount: 0
    };
  }
};


export const geteventshome = async () => {
  try {
    // Fetch products
    const eventshome = await Events.find();

    const eventslist = eventshome.map(blog => ({
      title: blog.title,
      newsLink: blog.newsLink, // unchanged
      startDate: blog.startDate,
      
    }));


    return {
      eventslist,
      
    };
  } catch (error) {
    console.error("Error fetching Products:", error);
    return {
      message: "Failed to fetch Products",
      eventslist: [],
    };
  }
};