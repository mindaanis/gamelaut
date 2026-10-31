// Valid passwords: custom (pa_teacher_pwd) or standard presets for PGRI & Wonogiri teachers
const PRESET_TEACHER_PASSWORDS = [
  'GURUPGRI2026',
  'guru2026',
  'PGRI81',
  'pgri81',
  'JATIROTO2026',
  'jatiroto2026',
  'WONOGIRI',
  'wonogiri'
];

export function verifyTeacherPassword(input: string): boolean {
  const clean = input.trim();
  if (!clean) return false;
  let customPwd: string | null = null;
  try {
    customPwd = localStorage.getItem('pa_teacher_pwd');
  } catch {}
  return PRESET_TEACHER_PASSWORDS.includes(clean) || (!!customPwd && clean === customPwd);
}
