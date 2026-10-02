/*
 * Ghép className, bỏ qua giá trị rỗng/false.
 */

export default function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}
