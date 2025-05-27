export const getTeamGradient = (teamNumber: string) => {
  // Use the last character of team number to determine gradient
  const lastChar = parseInt(teamNumber.slice(-1), 10);
  const gradients = [
    'from-blue-500 to-indigo-500',    // 0
    'from-indigo-500 to-purple-500',  // 1
    'from-purple-500 to-pink-500',    // 2
    'from-pink-500 to-rose-500',      // 3
    'from-rose-500 to-red-500',       // 4
    'from-sky-500 to-blue-500',       // 5
    'from-teal-500 to-cyan-500',      // 6
    'from-emerald-500 to-teal-500',   // 7
    'from-violet-500 to-purple-500',  // 8
    'from-fuchsia-500 to-pink-500',   // 9
  ];
  return gradients[lastChar] || gradients[0];
}; 