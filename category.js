const { loadData, saveData } = require('./storage');

function addCategory(name) {
  const data = loadData();
  const trimmed = name.trim();
  
  if (!trimmed) {
    throw new Error('Category name cannot be empty.');
  }

  const exists = data.categories.some(c => c.toLowerCase() === trimmed.toLowerCase());
  if (exists) {
    throw new Error(`Category "${trimmed}" already exists.`);
  }

  // Preserve casing of user input
  data.categories.push(trimmed);
  saveData(data);
  return trimmed;
}

function listCategories() {
  const data = loadData();
  return data.categories;
}

module.exports = {
  addCategory,
  listCategories
};
