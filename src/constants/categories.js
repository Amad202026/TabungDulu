// Static icon map — categories are now user-managed in store
export const CAT_ICONS = {
  'Gaji':'work','Freelance':'storefront','Investasi':'trending_up','Bisnis':'business_center',
  'Bonus':'card_giftcard','Makanan':'restaurant','Transport':'directions_car','Belanja':'shopping_bag',
  'Tagihan':'electric_bolt','Hiburan':'movie','Kesehatan':'health_and_safety','Pendidikan':'school',
  'Lainnya':'add_circle',
}

export const catIcon = (cat) => CAT_ICONS[cat] || 'payments'

// Legacy exports for TxnModal compatibility — now components should read from store
export const INCOME_CATS  = [
  {value:'Gaji',icon:'work'},{value:'Freelance',icon:'storefront'},
  {value:'Investasi',icon:'trending_up'},{value:'Bisnis',icon:'business_center'},
  {value:'Bonus',icon:'card_giftcard'},{value:'Lainnya',icon:'add_circle'},
]
export const EXPENSE_CATS = [
  {value:'Makanan',icon:'restaurant'},{value:'Transport',icon:'directions_car'},
  {value:'Belanja',icon:'shopping_bag'},{value:'Tagihan',icon:'electric_bolt'},
  {value:'Hiburan',icon:'movie'},{value:'Kesehatan',icon:'health_and_safety'},
  {value:'Pendidikan',icon:'school'},{value:'Lainnya',icon:'more_horiz'},
]
export const ALL_CATS = [...INCOME_CATS,...EXPENSE_CATS]
