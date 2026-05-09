import express from 'express';
const app = express();
app.get('/', (req, res) => res.send('OK'));
app.listen(3002, () => console.log('Simple app listening on 3002'));
console.log('End of script');
