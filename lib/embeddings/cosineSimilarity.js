export function cosineSimilarity(firstVector, secondVector) {
  if (!Array.isArray(firstVector) || !Array.isArray(secondVector)) return 0;
  if (firstVector.length === 0 || firstVector.length !== secondVector.length) {
    return 0;
  }

  let dotProduct = 0;
  let firstMagnitude = 0;
  let secondMagnitude = 0;

  for (let index = 0; index < firstVector.length; index += 1) {
    const firstValue = Number(firstVector[index]);
    const secondValue = Number(secondVector[index]);

    if (!Number.isFinite(firstValue) || !Number.isFinite(secondValue)) {
      return 0;
    }

    dotProduct += firstValue * secondValue;
    firstMagnitude += firstValue * firstValue;
    secondMagnitude += secondValue * secondValue;
  }

  if (firstMagnitude === 0 || secondMagnitude === 0) return 0;

  return dotProduct / (Math.sqrt(firstMagnitude) * Math.sqrt(secondMagnitude));
}
