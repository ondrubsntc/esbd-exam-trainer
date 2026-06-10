// Leitner box → colour, shared across the app: B1 red, B2 orange, B3 yellow, B4–5 green.
export function boxPillClass(box) {
  if (box <= 1) return "bg-red-100 text-red-700";
  if (box === 2) return "bg-orange-100 text-orange-700";
  if (box === 3) return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}

export function boxFillClass(box) {
  if (box <= 1) return "bg-red-500";
  if (box === 2) return "bg-orange-500";
  if (box === 3) return "bg-yellow-400";
  return "bg-green-500";
}
