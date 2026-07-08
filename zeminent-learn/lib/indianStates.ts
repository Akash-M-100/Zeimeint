/**
 * Slice 14 B.5: Indian states + UTs with GST state codes. Used by the
 * placement-program checkout's billing-address dropdown. The `code` is
 * the 2-digit GSTIN state code (first two characters of any valid
 * GSTIN). The backend uses it to decide intra-state CGST+SGST vs
 * inter-state IGST when computing the tax invoice — see
 * payment.service.js + invoice.service.js. Order follows the
 * official GST jurisdictional list, which is the order admins expect
 * to see in dropdowns.
 *
 * '28' (Andhra Pradesh, Old) is kept for historical orders that may
 * surface in /payments/me; new enrollments should pick '37'.
 */

export type IndianState = {
  code: string;
  name: string;
};

export const INDIAN_STATES: IndianState[] = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '25', name: 'Daman and Diu' },
  { code: '26', name: 'Dadra and Nagar Haveli' },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh (Old)' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
];

export function findStateByCode(code: string): IndianState | null {
  return INDIAN_STATES.find((s) => s.code === code) || null;
}

export function findStateByName(name: string): IndianState | null {
  return INDIAN_STATES.find((s) => s.name === name) || null;
}
