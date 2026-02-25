export const calculateScore = (tags) => {
  let score = 3; // Start at neutral 3
  if (tags.wheelchair === 'yes') score += 1;
  if (tags.wheelchair === 'designated') score += 2;
  if (tags.surface === 'asphalt' || tags.surface === 'paving_stones') score += 0.5;
  if (tags.smoothness === 'excellent') score += 0.5;
  
  // Penalties
  if (tags.kerb === 'raised') score -= 2;
  if (tags.incline > 6) score -= 2;
  if (tags.surface === 'cobblestone') score -= 1.5;

  return Math.min(Math.max(score, 0), 5).toFixed(1);
};