/**
 * Lightweight authoritative frontend internationalization dictionary.
 * Supports English, Bengali, and Arabic.
 */

export type LanguageCode = "English" | "Bengali" | "Arabic";

export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  English: {
    // ── Navigation & Common Header ──
    "nav.home": "Home",
    "nav.products": "Products",
    "nav.all_apparel": "All Apparel",
    "nav.men": "Men",
    "nav.women": "Women",
    "nav.boys": "Boys",
    "nav.girls": "Girls",
    "nav.unisex": "Unisex",
    "nav.rfq": "RFQ",
    "nav.rfq_full": "Request for Quotation",
    "nav.search": "Search apparel...",
    "nav.search_placeholder": "Search products...",
    "nav.search_button": "Search",
    "nav.account": "Account",
    "nav.buyer_portal": "Buyer Portal",
    "nav.sign_in": "Sign In",
    "nav.sign_in_register": "Sign In / Register",
    "nav.dashboard": "Dashboard",
    "nav.cart": "Cart",
    "nav.shopping_bag": "Shopping Bag",
    "nav.wishlist": "Wishlist",
    "nav.saved_items": "Saved Items",
    "nav.deliver_to": "Deliver to",
    "nav.deliver_to_colon": "Deliver to:",
    "nav.language": "Language",
    "nav.language_colon": "Language:",
    "nav.change": "Change",
    "nav.select_location": "Select Location",
    "nav.wholesale_inquiries": "Wholesale Inquiries",

    // ── Hero Banner ──
    "hero.eyebrow": "Ayaan Clothing",
    "hero.title": "Garment Manufacturer & Exporter in Bangladesh",
    "hero.subtitle": "Supplying international buyers with wholesale apparel, stock lots, factory surplus, and custom OEM production.",
    "hero.explore": "Explore Catalog",

    // ── Homepage Sections ──
    "home.featured_brands": "Featured Brands",
    "home.shop_by_brand": "Shop by Brand",
    "home.all_brands": "All Brands",
    "home.audience": "Audience",
    "home.design_type": "Design Type",
    "home.categories": "Categories",
    "home.all_categories": "All Categories",
    "home.featured_products": "Featured Products",
    "home.best_deals": "Best Deals",
    "home.new_arrivals": "New Arrivals",
    "home.filters": "Filters",
    "home.active_filters": "Active Filters:",
    "home.clear_filters": "Clear Filters",
    "home.clear_all": "Clear All",
    "home.load_more": "Load More",
    "home.loading": "Loading...",
    "home.no_products": "No products found",
    "home.no_products_filter_desc": "No products match your selected filters.",
    "home.error_title": "Couldn't load products.",
    "home.error_desc": "Please try again.",
    "home.retry": "Retry",
    "home.compliance_title": "Compliance & Ethical Sourcing",

    // ── Search & Discovery Dropdown ──
    "search.recent_searches": "Recent Searches",
    "search.clear": "Clear",
    "search.no_recent": "No recent searches",
    "search.no_matching": "No matching searches",
    "search.trending_brands": "Trending Brands",
    "search.all_brands": "All Brands",
    "search.matching_products": "Products",
    "search.top_categories": "Top Categories",
    "search.no_results_for": "No matching products found for",
    "search.no_results_help": "Try checking for spelling errors or searching for a general term like jacket, denim, or polo.",
    "search.view_all_results": "View All Results",
    "search.results_heading": "Search Results",
    "search.all_products": "All Products",
    "search.showing_matching": "Showing wholesale & retail products matching",
    "search.sort": "Sort",
    "search.sort_newest": "Newest First",
    "search.sort_price_asc": "Price: Low → High",
    "search.sort_price_desc": "Price: High → Low",
    "search.sort_popular": "Most Popular",
    "search.clear_search": "Clear Search",
    "search.brand": "Brand",
    "search.search_brands": "Search brands...",
    "search.no_brands": "No brands found.",
    "search.search_categories": "Search categories...",
    "search.no_categories": "No categories found.",
    "search.close": "Close",

    // ── B2B, Products & Product Cards ──
    "product.quick_add": "Quick Add",
    "product.add_to_cart": "Add to Cart",
    "product.add_to_rfq": "Add to RFQ",
    "product.sold_out": "Sold Out",
    "product.out_of_stock": "Out of Stock",
    "product.inquire_quote": "Inquire / Quote",
    "product.pre_order": "Pre-Order",
    "product.price_on_request": "Price on Request",
    "product.per_pc": "/ pc",
    "product.moq": "MOQ",
    "product.moq_pcs": "MOQ {count} pcs",
    "product.pcs_minimum": "pcs minimum",
    "product.delivery": "Delivery:",
    "product.in_stock": "In Stock",
    "product.wholesale_pricing": "Wholesale Pricing",
    "product.specifications": "Specifications",
    "product.fabric_material": "Fabric / Material",
    "product.gsm_weight": "GSM / Weight",
    "product.gender_audience": "Gender / Audience",
    "product.design_type": "Design Type",
    "product.original": "Original",
    "product.master_copy": "Master Copy",
    "product.packaging": "Packaging",
    "product.country_origin": "Country of Origin",
    "product.bangladesh": "Bangladesh",
    "product.request_quote": "Request Commercial Quote",
    "product.related_products": "More from this brand",
    "product.select_quantity": "Select Quantity",
    "product.total_price": "Total Price",

    // ── B2B & Wholesale General ──
    "b2b.wholesale_pricing": "Wholesale Price",
    "b2b.moq": "Minimum Order Quantity (MOQ)",
    "b2b.moq_units": "pcs minimum",
    "b2b.request_quote": "Request Commercial Quote",
    "b2b.net30": "Net 30 Terms",
    "b2b.b2b_buyer": "Customer Account",

    // ── Cart & MiniCart ──
    "cart.title": "Shopping Bag",
    "cart.empty_title": "Your cart is empty",
    "cart.empty_desc": "Add items or request a wholesale quote to get started.",
    "cart.browse_products": "Browse Products",
    "cart.select_all": "Select All",
    "cart.delete": "Delete",
    "cart.delete_selected": "Delete Selected",
    "cart.subtotal": "Subtotal",
    "cart.checkout": "Proceed to Checkout",
    "cart.request_rfq": "Request RFQ for Cart",

    // ── Action Buttons ──
    "action.add_to_cart": "Add to Cart",
    "action.checkout": "Proceed to Checkout",
    "action.view_details": "View Details",
    "action.save": "Save Changes",
    "action.cancel": "Cancel",
    "action.retry": "Retry",

    // ── Modals ──
    "modal.language_title": "Select Language",
    "modal.language_desc": "Choose your preferred interface language. All transactions and catalog pricing are strictly in USD ($).",
    "modal.save_language": "Save Language",
    "modal.location_title": "Choose your location",
    "modal.location_desc": "Delivery options and speeds may vary based on your selected destination.",
    "modal.sign_in_addresses": "Sign in to see your addresses",
    "modal.deliver_outside_bd": "Deliver outside Bangladesh",
    "modal.select_country": "Select Country",
    "modal.done": "Done",

    // ── Footer ──
    "footer.categories": "Categories",
    "footer.brands": "Brands",
    "footer.wholesale_sourcing": "Wholesale Sourcing",
    "footer.rfq": "Request for Quotation (RFQ)",
    "footer.compliance": "Compliance & Certifications",
    "footer.all_categories": "All Categories",
    "footer.all_brands": "All Brands",
    "footer.back_to_top": "Back to top",
    "footer.rights": "All rights reserved.",
    "footer.terms": "Terms & Conditions",
    "footer.privacy": "Privacy Policy",
  },

  Bengali: {
    // ── Navigation & Common Header ──
    "nav.home": "হোম",
    "nav.products": "পণ্যসমূহ",
    "nav.all_apparel": "সকল পোশাক",
    "nav.men": "পুরুষ",
    "nav.women": "মহিলা",
    "nav.boys": "ছেলেদের",
    "nav.girls": "মেয়েদের",
    "nav.unisex": "ইউনিসেক্স",
    "nav.rfq": "আরএফকিউ",
    "nav.rfq_full": "উদ্ধৃতি অনুরোধ (আরএফকিউ)",
    "nav.search": "পোশাক অনুসন্ধান করুন...",
    "nav.search_placeholder": "পোশাক ও পণ্য খুঁজুন...",
    "nav.search_button": "অনুসন্ধান",
    "nav.account": "অ্যাকাউন্ট",
    "nav.buyer_portal": "বায়ার পোর্টাল",
    "nav.sign_in": "সাইন ইন",
    "nav.sign_in_register": "লগইন / রেজিস্টার",
    "nav.dashboard": "ড্যাশবোর্ড",
    "nav.cart": "কার্ট",
    "nav.shopping_bag": "শপিং ব্যাগ",
    "nav.wishlist": "পছন্দের তালিকা",
    "nav.saved_items": "সংরক্ষিত পণ্য",
    "nav.deliver_to": "ডেলিভারি গন্তব্য",
    "nav.deliver_to_colon": "ডেলিভারি:",
    "nav.language": "ভাষা",
    "nav.language_colon": "ভাষা:",
    "nav.change": "পরিবর্তন",
    "nav.select_location": "অবস্থান নির্বাচন",
    "nav.wholesale_inquiries": "পাইকারি অনুসন্ধান",

    // ── Hero Banner ──
    "hero.eyebrow": "আয়ান ক্লোথিং",
    "hero.title": "বাংলাদেশের নির্ভরযোগ্য পোশাক প্রস্তুতকারক ও রপ্তানিকারক",
    "hero.subtitle": "আন্তর্জাতিক বায়ারদের জন্য পাইকারি তৈরি পোশাক, এক্সপোর্ট স্টক লট, ফ্যাক্টরি সারপ্লাস ও কাস্টম ওএম উৎপাদন।",
    "hero.explore": "ক্যাটালগ দেখুন",

    // ── Homepage Sections ──
    "home.featured_brands": "জনপ্রিয় ব্র্যান্ডসমূহ",
    "home.shop_by_brand": "ব্র্যান্ড অনুযায়ী খুঁজুন",
    "home.all_brands": "সকল ব্র্যান্ড",
    "home.audience": "অডিয়েন্স",
    "home.design_type": "ডিজাইন টাইপ",
    "home.categories": "ক্যাটাগরি",
    "home.all_categories": "সকল ক্যাটাগরি",
    "home.featured_products": "বাছাইকৃত পণ্যসমূহ",
    "home.best_deals": "হট ডিল",
    "home.new_arrivals": "নতুন পণ্য",
    "home.filters": "ফিল্টার",
    "home.active_filters": "সক্রিয় ফিল্টার:",
    "home.clear_filters": "ফিল্টার মুছুন",
    "home.clear_all": "সব মুছুন",
    "home.load_more": "আরও দেখুন",
    "home.loading": "লোড হচ্ছে...",
    "home.no_products": "কোনো পণ্য পাওয়া যায়নি",
    "home.no_products_filter_desc": "আপনার নির্বাচিত ফিল্টারের সাথে কোনো পণ্য মেলেনি।",
    "home.error_title": "পণ্য লোড করা যায়নি।",
    "home.error_desc": "অনুগ্রহ করে আবার চেষ্টা করুন।",
    "home.retry": "পুনরায় চেষ্টা করুন",
    "home.compliance_title": "কমপ্লায়েন্স ও আন্তর্জাতিক মান",

    // ── Search & Discovery Dropdown ──
    "search.recent_searches": "সাম্প্রতিক অনুসন্ধান",
    "search.clear": "মুছুন",
    "search.no_recent": "কোনো সাম্প্রতিক অনুসন্ধান নেই",
    "search.no_matching": "কোনো অনুসন্ধান মেলেনি",
    "search.trending_brands": "জনপ্রিয় ব্র্যান্ড",
    "search.all_brands": "সকল ব্র্যান্ড",
    "search.matching_products": "পণ্যসমূহ",
    "search.top_categories": "শীর্ষ ক্যাটাগরি",
    "search.no_results_for": "এর জন্য কোনো পণ্য পাওয়া যায়নি",
    "search.no_results_help": "বানান পরীক্ষা করুন অথবা জ্যাকেট, ডেনিম বা পোলোর মতো সাধারণ শব্দ দিয়ে অনুসন্ধান করুন।",
    "search.view_all_results": "সকল ফলাফল দেখুন",
    "search.results_heading": "অনুসন্ধান ফলাফল",
    "search.all_products": "সকল পণ্য",
    "search.showing_matching": "অনুসন্ধানের সাথে মিল থাকা পাইকারি ও খুচরা পণ্য",
    "search.sort": "সাজান",
    "search.sort_newest": "নতুন পণ্য আগে",
    "search.sort_price_asc": "দাম: কম থেকে বেশি",
    "search.sort_price_desc": "দাম: বেশি থেকে কম",
    "search.sort_popular": "সর্বাধিক জনপ্রিয়",
    "search.clear_search": "অনুসন্ধান মুছুন",
    "search.brand": "ব্র্যান্ড",
    "search.search_brands": "ব্র্যান্ড খুঁজুন...",
    "search.no_brands": "কোনো ব্র্যান্ড পাওয়া যায়নি।",
    "search.search_categories": "ক্যাটাগরি খুঁজুন...",
    "search.no_categories": "কোনো ক্যাটাগরি পাওয়া যায়নি।",
    "search.close": "বন্ধ করুন",

    // ── B2B, Products & Product Cards ──
    "product.quick_add": "দ্রুত যোগ",
    "product.add_to_cart": "কার্টে যোগ করুন",
    "product.add_to_rfq": "আরএফকিউ-তে যোগ করুন",
    "product.sold_out": "স্টক শেষ",
    "product.out_of_stock": "স্টক নেই",
    "product.inquire_quote": "উদ্ধৃতি চান",
    "product.pre_order": "প্রি-অর্ডার",
    "product.price_on_request": "অনুরোধে মূল্য",
    "product.per_pc": "/ পিস",
    "product.moq": "MOQ",
    "product.moq_pcs": "MOQ {count} পিস",
    "product.pcs_minimum": "পিস সর্বনিম্ন",
    "product.delivery": "ডেলিভারি:",
    "product.in_stock": "স্টকে আছে",
    "product.wholesale_pricing": "পাইকারি মূল্য",
    "product.specifications": "স্পেসিফিকেশন",
    "product.fabric_material": "ফেব্রিক / উপাদান",
    "product.gsm_weight": "জিএসএম / ওজন",
    "product.gender_audience": "জেন্ডার / অডিয়েন্স",
    "product.design_type": "ডিজাইন টাইপ",
    "product.original": "অরিজিনাল",
    "product.master_copy": "মাস্টার কপি",
    "product.packaging": "প্যাকেজিং",
    "product.country_origin": "উৎপাদক দেশ",
    "product.bangladesh": "বাংলাদেশ",
    "product.request_quote": "বাণিজ্যিক উদ্ধৃতি চান",
    "product.related_products": "এই ব্র্যান্ডের আরও পণ্য",
    "product.select_quantity": "পরিমাণ নির্বাচন করুন",
    "product.total_price": "মোট মূল্য",

    // ── B2B & Wholesale General ──
    "b2b.wholesale_pricing": "পাইকারি মূল্য",
    "b2b.moq": "সর্বনিম্ন অর্ডার পরিমাণ (MOQ)",
    "b2b.moq_units": "পিস সর্বনিম্ন",
    "b2b.request_quote": "উদ্ধৃতি অনুরোধ করুন",
    "b2b.net30": "নেট ৩০ শর্তাবলি",
    "b2b.b2b_buyer": "গ্রাহক অ্যাকাউন্ট",

    // ── Cart & MiniCart ──
    "cart.title": "শপিং ব্যাগ",
    "cart.empty_title": "আপনার কার্ট খালি",
    "cart.empty_desc": "শুরু করতে পণ্য যোগ করুন বা পাইকারি উদ্ধৃতি অনুরোধ করুন।",
    "cart.browse_products": "পণ্যসমূহ দেখুন",
    "cart.select_all": "সব নির্বাচন করুন",
    "cart.delete": "মুছুন",
    "cart.delete_selected": "সিলেক্ট করা পণ্য মুছুন",
    "cart.subtotal": "সর্বমোট",
    "cart.checkout": "চেকআউট করুন",
    "cart.request_rfq": "কার্টের আরএফকিউ পাঠান",

    // ── Action Buttons ──
    "action.add_to_cart": "কার্টে যোগ করুন",
    "action.checkout": "চেকআউট করুন",
    "action.view_details": "বিস্তারিত দেখুন",
    "action.save": "সংরক্ষণ করুন",
    "action.cancel": "বাতিল",
    "action.retry": "পুনরায় চেষ্টা করুন",

    // ── Modals ──
    "modal.language_title": "ভাষা নির্বাচন করুন",
    "modal.language_desc": "আপনার পছন্দের ভাষা নির্বাচন করুন। সকল লেনদেন ও পণ্যের মূল্য ইউএস ডলারে ($) হিসাব করা হবে।",
    "modal.save_language": "ভাষা সংরক্ষণ করুন",
    "modal.location_title": "আপনার অবস্থান নির্বাচন করুন",
    "modal.location_desc": "নির্বাচিত গন্তব্যের ওপর ভিত্তি করে ডেলিভারি বিকল্প ও সময় পরিবর্তিত হতে পারে।",
    "modal.sign_in_addresses": "ঠিকানা দেখতে সাইন ইন করুন",
    "modal.deliver_outside_bd": "বাংলাদেশের বাইরে ডেলিভারি",
    "modal.select_country": "দেশ নির্বাচন করুন",
    "modal.done": "সম্পন্ন",

    // ── Footer ──
    "footer.categories": "ক্যাটাগরি",
    "footer.brands": "ব্র্যান্ড",
    "footer.wholesale_sourcing": "পাইকারি সোর্সিং",
    "footer.rfq": "উদ্ধৃতি অনুরোধ (RFQ)",
    "footer.compliance": "কমপ্লায়েন্স ও সনদসমূহ",
    "footer.all_categories": "সকল ক্যাটাগরি",
    "footer.all_brands": "সকল ব্র্যান্ড",
    "footer.back_to_top": "উপরে যান",
    "footer.rights": "সর্বস্বত্ব সংরক্ষিত।",
    "footer.terms": "শর্তাবলি",
    "footer.privacy": "গোপনীয়তা নীতি",
  },

  Arabic: {
    // ── Navigation & Common Header ──
    "nav.home": "الرئيسية",
    "nav.products": "المنتجات",
    "nav.all_apparel": "جميع الملابس",
    "nav.men": "رجالي",
    "nav.women": "نسائي",
    "nav.boys": "أولاد",
    "nav.girls": "بنات",
    "nav.unisex": "للجنسين",
    "nav.rfq": "طلب عرض سعر",
    "nav.rfq_full": "طلب عرض أسعار بالجملة",
    "nav.search": "البحث عن الملابس...",
    "nav.search_placeholder": "البحث عن المنتجات...",
    "nav.search_button": "بحث",
    "nav.account": "الحساب",
    "nav.buyer_portal": "بوابة المشترين",
    "nav.sign_in": "تسجيل الدخول",
    "nav.sign_in_register": "تسجيل الدخول / التسجيل",
    "nav.dashboard": "لوحة التحكم",
    "nav.cart": "عربة التسوق",
    "nav.shopping_bag": "حقيبة التسوق",
    "nav.wishlist": "المفضلة",
    "nav.saved_items": "العناصر المحفوظة",
    "nav.deliver_to": "التوصيل إلى",
    "nav.deliver_to_colon": "التوصيل إلى:",
    "nav.language": "اللغة",
    "nav.language_colon": "اللغة:",
    "nav.change": "تغيير",
    "nav.select_location": "تحديد الموقع",
    "nav.wholesale_inquiries": "استفسارات الجملة",

    // ── Hero Banner ──
    "hero.eyebrow": "أيان للملابس",
    "hero.title": "مصنع ومصدر ملابس في بنغلاديش",
    "hero.subtitle": "تزويد المشترين الدوليين بملابس بالجملة وفائض المصانع والإنتاج المخصص حسب الطلب.",
    "hero.explore": "استكشف الكتالوج",

    // ── Homepage Sections ──
    "home.featured_brands": "العلامات التجارية المميزة",
    "home.shop_by_brand": "تسوق حسب العلامة التجارية",
    "home.all_brands": "جميع العلامات التجارية",
    "home.audience": "الفئات",
    "home.design_type": "نوع التصميم",
    "home.categories": "التصنيفات",
    "home.all_categories": "جميع التصنيفات",
    "home.featured_products": "المنتجات المميزة",
    "home.best_deals": "أفضل الصفقات",
    "home.new_arrivals": "وصل حديثاً",
    "home.filters": "تصفية",
    "home.active_filters": "الفلاتر النشطة:",
    "home.clear_filters": "مسح الفلاتر",
    "home.clear_all": "مسح الكل",
    "home.load_more": "تحميل المزيد",
    "home.loading": "جار التحميل...",
    "home.no_products": "لم يتم العثور على منتجات",
    "home.no_products_filter_desc": "لا توجد منتجات تطابق اختياراتك.",
    "home.error_title": "تعذر تحميل المنتجات.",
    "home.error_desc": "يرجى المحاولة مرة أخرى.",
    "home.retry": "إعادة المحاولة",
    "home.compliance_title": "الامتثال والمعايير الدولية",

    // ── Search & Discovery Dropdown ──
    "search.recent_searches": "عمليات البحث الأخيرة",
    "search.clear": "مسح",
    "search.no_recent": "لا توجد عمليات بحث أخيرة",
    "search.no_matching": "لا توجد نتائج مطابقة",
    "search.trending_brands": "العلامات التجارية الرائجة",
    "search.all_brands": "جميع العلامات التجارية",
    "search.matching_products": "المنتجات",
    "search.top_categories": "أهم التصنيفات",
    "search.no_results_for": "لم يتم العثور على منتجات مطابقة لـ",
    "search.no_results_help": "تحقق من الأخطاء الإملائية أو ابحث عن مصطلح عام مثل سترة أو جينز أو بولو.",
    "search.view_all_results": "عرض جميع النتائج",
    "search.results_heading": "نتائج البحث",
    "search.all_products": "جميع المنتجات",
    "search.showing_matching": "عرض منتجات الجملة المطابقة لـ",
    "search.sort": "ترتيب",
    "search.sort_newest": "الأحدث أولاً",
    "search.sort_price_asc": "السعر: من الأقل للأعلى",
    "search.sort_price_desc": "السعر: من الأعلى للأقل",
    "search.sort_popular": "الأكثر شهرة",
    "search.clear_search": "مسح البحث",
    "search.brand": "العلامة التجارية",
    "search.search_brands": "البحث في العلامات التجارية...",
    "search.no_brands": "لم يتم العثور على علامات تجارية.",
    "search.search_categories": "البحث في التصنيفات...",
    "search.no_categories": "لم يتم العثور على تصنيفات.",
    "search.close": "إغلاق",

    // ── B2B, Products & Product Cards ──
    "product.quick_add": "إضافة سريعة",
    "product.add_to_cart": "أضف إلى السلة",
    "product.add_to_rfq": "إضافة إلى طلب السعر",
    "product.sold_out": "نفدت الكمية",
    "product.out_of_stock": "غير متوفر بالمخزون",
    "product.inquire_quote": "طلب استفسار / سعر",
    "product.pre_order": "طلب مسبق",
    "product.price_on_request": "السعر عند الطلب",
    "product.per_pc": "/ قطعة",
    "product.moq": "MOQ",
    "product.moq_pcs": "MOQ {count} قطعة",
    "product.pcs_minimum": "قطعة كحد أدنى",
    "product.delivery": "التوصيل:",
    "product.in_stock": "متوفر في المخزون",
    "product.wholesale_pricing": "أسعار الجملة",
    "product.specifications": "المواصفات",
    "product.fabric_material": "القماش / الخامة",
    "product.gsm_weight": "الوزن / GSM",
    "product.gender_audience": "الفئة المستهدفة",
    "product.design_type": "نوع التصميم",
    "product.original": "أصلي",
    "product.master_copy": "ماستر كوبي",
    "product.packaging": "التعبئة والتغليف",
    "product.country_origin": "بلد المنشأ",
    "product.bangladesh": "بنغلاديش",
    "product.request_quote": "طلب عرض أسعار تجاري",
    "product.related_products": "المزيد من هذه العلامة",
    "product.select_quantity": "حدد الكمية",
    "product.total_price": "السعر الإجمالي",

    // ── B2B & Wholesale General ──
    "b2b.wholesale_pricing": "سعر الجملة",
    "b2b.moq": "الحد الأدنى للطلب (MOQ)",
    "b2b.moq_units": "قطعة كحد أدنى",
    "b2b.request_quote": "طلب عرض أسعار تجاري",
    "b2b.net30": "شروط الدفع الآجل (صافي 30 يومًا)",
    "b2b.b2b_buyer": "حساب العميل",

    // ── Cart & MiniCart ──
    "cart.title": "حقيبة التسوق",
    "cart.empty_title": "عربة التسوق فارغة",
    "cart.empty_desc": "أضف عناصر أو اطلب عرض أسعار بالجملة للبدء.",
    "cart.browse_products": "تصفح المنتجات",
    "cart.select_all": "تحديد الكل",
    "cart.delete": "حذف",
    "cart.delete_selected": "حذف المحدد",
    "cart.subtotal": "المجموع الفرعي",
    "cart.checkout": "إتمام الشراء",
    "cart.request_rfq": "طلب تسعير للعربة",

    // ── Action Buttons ──
    "action.add_to_cart": "أضف إلى السلة",
    "action.checkout": "إتمام الشراء",
    "action.view_details": "عرض التفاصيل",
    "action.save": "حفظ التغييرات",
    "action.cancel": "إلغاء",
    "action.retry": "إعادة المحاولة",

    // ── Modals ──
    "modal.language_title": "اختر اللغة",
    "modal.language_desc": "حدد لغتك المفضلة. يتم احتساب جميع الأسعار بالدولار الأمريكي ($) فقط.",
    "modal.save_language": "حفظ اللغة",
    "modal.location_title": "حدد موقعك",
    "modal.location_desc": "قد تختلف خيارات وسرعة التوصيل حسب وجهتك المحددة.",
    "modal.sign_in_addresses": "تسجيل الدخول لعرض عناوينك",
    "modal.deliver_outside_bd": "التوصيل خارج بنغلاديش",
    "modal.select_country": "اختر الدولة",
    "modal.done": "تم",

    // ── Footer ──
    "footer.categories": "التصنيفات",
    "footer.brands": "العلامات التجارية",
    "footer.wholesale_sourcing": "توريد الجملة",
    "footer.rfq": "طلب عرض سعر (RFQ)",
    "footer.compliance": "الشهادات والامتثال",
    "footer.all_categories": "جميع التصنيفات",
    "footer.all_brands": "جميع العلامات التجارية",
    "footer.back_to_top": "العودة للأعلى",
    "footer.rights": "جميع الحقوق محفوظة.",
    "footer.terms": "الشروط والأحكام",
    "footer.privacy": "سياسة الخصوصية",
  },
};

/**
 * Common taxonomies bilingual translation helpers
 */
const AUDIENCE_TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  English: {
    MEN: "Men",
    WOMEN: "Women",
    BOYS: "Boys",
    GIRLS: "Girls",
    UNISEX: "Unisex",
  },
  Bengali: {
    MEN: "পুরুষ",
    WOMEN: "মহিলা",
    BOYS: "ছেলেদের",
    GIRLS: "মেয়েদের",
    UNISEX: "ইউনিসেক্স",
  },
  Arabic: {
    MEN: "رجالي",
    WOMEN: "نسائي",
    BOYS: "أولاد",
    GIRLS: "بنات",
    UNISEX: "للجنسين",
  },
};

const DESIGN_TYPE_TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  English: {
    ORIGINAL: "Original",
    "MASTER COPY": "Master Copy",
  },
  Bengali: {
    ORIGINAL: "অরিজিনাল",
    "MASTER COPY": "মাস্টার কপি",
  },
  Arabic: {
    ORIGINAL: "أصلي",
    "MASTER COPY": "ماستر كوبي",
  },
};

const CATEGORY_TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  English: {
    "t-shirts": "T-Shirts",
    tshirts: "T-Shirts",
    shirts: "Shirts",
    jeans: "Jeans",
    denim: "Denim",
    hoodies: "Hoodies",
    jackets: "Jackets",
    sweaters: "Sweaters",
    polos: "Polos",
    polo: "Polo",
    pants: "Pants",
    shorts: "Shorts",
    dresses: "Dresses",
    sportswear: "Sportswear",
    trousers: "Trousers",
    bodycon: "Bodycon",
    "long pants": "Long Pants",
    "long dress": "Long Dress",
    "knit tops": "Knit Tops",
    "winter sets": "Winter Sets",
    "women's dresses": "Women's Dresses",
    "caps / hats": "Caps / Hats",
    "2 pc sets": "2 pc Sets",
  },
  Bengali: {
    "t-shirts": "টি-শার্ট",
    tshirts: "টি-শার্ট",
    shirts: "শার্ট",
    jeans: "জিন্স",
    denim: "ডেনিম",
    hoodies: "হুডি",
    jackets: "জ্যাকেট",
    sweaters: "সোয়েটার",
    polos: "পোলো শার্ট",
    polo: "পোলো শার্ট",
    pants: "প্যান্ট",
    shorts: "শর্টস",
    dresses: "ড্রেস",
    sportswear: "স্পোর্টসওয়্যার",
    trousers: "ট্রাউজার",
    bodycon: "বডিকন",
    "long pants": "লং প্যান্ট",
    "long dress": "লং ড্রেস",
    "knit tops": "নিট টপস",
    "winter sets": "উইন্টার সেট",
    "women's dresses": "মেয়েদের পোশাক",
    "caps / hats": "ক্যাপ / হ্যাট",
    "2 pc sets": "২ পিস সেট",
  },
  Arabic: {
    "t-shirts": "تي شيرت",
    tshirts: "تي شيرت",
    shirts: "قمصان",
    jeans: "جينز",
    denim: "دنيم",
    hoodies: "هوديز",
    jackets: "سترات",
    sweaters: "كنزات صوف",
    polos: "بولو",
    polo: "بولو",
    pants: "بناطيل",
    shorts: "شورتات",
    dresses: "فساتين",
    sportswear: "ملابس رياضية",
    trousers: "بناطيل رسمية",
    bodycon: "بادي كون",
    "long pants": "بناطيل طويلة",
    "long dress": "فساتين طويلة",
    "knit tops": "بلايز تريكو",
    "winter sets": "أطقم شتوية",
    "women's dresses": "فساتين نسائية",
    "caps / hats": "قبعات",
    "2 pc sets": "أطقم قطعتين",
  },
};

export function normalizeLanguage(lang: LanguageCode | string): LanguageCode {
  if (lang === "Bengali" || lang === "bn") return "Bengali";
  if (lang === "Arabic" || lang === "ar") return "Arabic";
  return "English";
}

/**
 * Translate a generic string key with fallback support
 */
export function translateString(key: string, lang: LanguageCode | string, fallback?: string): string {
  const norm = normalizeLanguage(lang);
  const dict = TRANSLATIONS[norm] || TRANSLATIONS.English;
  if (dict && dict[key]) {
    return dict[key];
  }
  if (TRANSLATIONS.English && TRANSLATIONS.English[key]) {
    return TRANSLATIONS.English[key];
  }
  return fallback !== undefined ? fallback : key;
}

/**
 * Translate Audience category (Men, Women, Boys, Girls, Unisex)
 */
export function translateAudience(name: string, lang: LanguageCode | string): string {
  const norm = normalizeLanguage(lang);
  const upper = (name || "").trim().toUpperCase();
  const dict = AUDIENCE_TRANSLATIONS[norm] || AUDIENCE_TRANSLATIONS.English;
  return dict[upper] || name;
}

/**
 * Translate Design Type (Original, Master Copy)
 */
export function translateDesignType(type: string, lang: LanguageCode | string): string {
  const norm = normalizeLanguage(lang);
  const upper = (type || "").trim().toUpperCase();
  const dict = DESIGN_TYPE_TRANSLATIONS[norm] || DESIGN_TYPE_TRANSLATIONS.English;
  return dict[upper] || type;
}

/**
 * Translate standard apparel category names while preserving niche/custom backend categories gracefully
 */
export function translateCategory(catName: string, lang: LanguageCode | string): string {
  if (!catName) return "";
  const norm = normalizeLanguage(lang);
  const key = catName.trim().toLowerCase();
  const dict = CATEGORY_TRANSLATIONS[norm] || CATEGORY_TRANSLATIONS.English;
  return dict[key] || catName;
}

/**
 * Translate MOQ label while preserving exact integer count and technical standard acronym
 */
export function formatMoq(moqCount: number | string, lang: LanguageCode | string): string {
  const norm = normalizeLanguage(lang);
  if (norm === "Bengali") {
    return `MOQ ${moqCount} পিস`;
  }
  if (norm === "Arabic") {
    return `الحد الأدنى ${moqCount} قطعة`;
  }
  return `MOQ ${moqCount} pcs`;
}
