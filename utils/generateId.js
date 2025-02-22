function generateUniqueId() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 7; i > 0; --i) {
      result += characters[Math.floor(Math.random() * characters.length)];
    }
    return result;
  }
  
  module.exports = generateUniqueId;
  