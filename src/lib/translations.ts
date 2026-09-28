/**
 * Lightweight frontend internationalization dictionary.
 * Supports English, Bengali, and Arabic.
 */

export type LanguageCode = "English" | "Bengali" | "Arabic";

export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  English: {
    // Navigation & Common
    "nav.home": "Home",
    "nav.products": "Products",
    "nav.men": "Men",
    "nav.women": "Women",
    "nav.boys": "Boys",
    "nav.girls": "Girls",
    "nav.unisex": "Unisex",
    "nav.rfq": "Submit RFQ",
    "nav.search": "Search apparel...",
    "nav.account": "Account",
    "nav.cart": "Cart",
    "nav.wishlist": "Wishlist",
    "nav.deliver_to": "Deliver to",

    // B2B & Wholesale
    "b2b.wholesale_pricing": "Wholesale Price",
    "b2b.moq": "Minimum Order Quantity (MOQ)",
    "b2b.moq_units": "pcs minimum",
    "b2b.request_quote": "Request Commercial Quote",
    "b2b.net30": "Net 30 Terms",
    "b2b.b2b_buyer": "Customer Account",

    // Actions & Cart
    "action.add_to_cart": "Add to Cart",
    "action.checkout": "Proceed to Checkout",
    "action.view_details": "View Details",
    "action.save": "Save Changes",
    "action.cancel": "Cancel",
    "action.retry": "Retry",

    // Language modal
    "modal.language_title": "Select Language",
    "modal.language_desc": "Select your preferred language. Prices and currency are always in USD ($).",
  },
  Bengali: {
    // Navigation & Common
    "nav.home": "হোম",
    "nav.products": "পণ্যসমূহ",
    "nav.men": "পুরুষ",
    "nav.women": "মহিলা",
    "nav.boys": "ছেলেদের",
    "nav.girls": "মেয়েদের",
    "nav.unisex": "ইউনিসেক্স",
    "nav.rfq": "আরএফকিউ পাঠান",
    "nav.search": "পোশাক অনুসন্ধান করুন...",
    "nav.account": "অ্যাকাউন্ট",
    "nav.cart": "কার্ট",
    "nav.wishlist": "পছন্দের তালিকা",
    "nav.deliver_to": "ডেলিভারি গন্তব্য",

    // B2B & Wholesale
    "b2b.wholesale_pricing": "পাইকারি মূল্য",
    "b2b.moq": "সর্বনিম্ন অর্ডার পরিমাণ (MOQ)",
    "b2b.moq_units": "পিস সর্বনিম্ন",
    "b2b.request_quote": "উদ্ধৃতি অনুরোধ করুন",
    "b2b.net30": "নেট ৩০ শর্তাবলি",
    "b2b.b2b_buyer": "গ্রাহক অ্যাকাউন্ট",

    // Actions & Cart
    "action.add_to_cart": "কার্টে যোগ করুন",
    "action.checkout": "চেকআউট করুন",
    "action.view_details": "বিস্তারিত দেখুন",
    "action.save": "সংরক্ষণ করুন",
    "action.cancel": "বাতিল",
    "action.retry": "পুনরায় চেষ্টা করুন",

    // Language modal
    "modal.language_title": "ভাষা নির্বাচন করুন",
    "modal.language_desc": "আপনার পছন্দের ভাষা নির্বাচন করুন। সকল লেনদেন ইউএস ডলারে ($) সম্পন্ন হবে।",
  },
  Arabic: {
    // Navigation & Common
    "nav.home": "الرئيسية",
    "nav.products": "المنتجات",
    "nav.men": "رجالي",
    "nav.women": "نسائي",
    "nav.boys": "أولاد",
    "nav.girls": "بنات",
    "nav.unisex": "للجنسين",
    "nav.rfq": "طلب عرض سعر",
    "nav.search": "البحث عن الملابس...",
    "nav.account": "الحساب",
    "nav.cart": "عربة التسوق",
    "nav.wishlist": "المفضلة",
    "nav.deliver_to": "التوصيل إلى",

    // B2B & Wholesale
    "b2b.wholesale_pricing": "سعر الجملة",
    "b2b.moq": "الحد الأدنى للطلب (MOQ)",
    "b2b.moq_units": "قطعة كحد أدنى",
    "b2b.request_quote": "طلب عرض أسعار تجاري",
    "b2b.net30": "شروط الدفع الآجل (صافي 30 يومًا)",
    "b2b.b2b_buyer": "حساب العميل",

    // Actions & Cart
    "action.add_to_cart": "أضف إلى السلة",
    "action.checkout": "إتمام الشراء",
    "action.view_details": "عرض التفاصيل",
    "action.save": "حفظ التغييرات",
    "action.cancel": "إلغاء",
    "action.retry": "إعادة المحاولة",

    // Language modal
    "modal.language_title": "اختر اللغة",
    "modal.language_desc": "حدد لغتك المفضلة. يتم احتساب جميع الأسعار بالدولار الأمريكي ($) فقط.",
  },
};
