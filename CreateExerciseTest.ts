import axios, { AxiosResponse, AxiosRequestConfig, RawAxiosRequestHeaders } from 'axios';
import { authConfig } from './src/helpers/authHeader';

const client = axios.create({
  baseURL: 'http://localhost:8080',
});


(async () => {
  const config: AxiosRequestConfig = {
    headers: {
      'Accept': 'application/json',
      ...(await authConfig()).headers,
    } as RawAxiosRequestHeaders,
  };

  try {
  
    const quizId = "6a97c59f894828561586b01d"; //The id for the Italian quiz
    const data = { "quiz": "french" , "topic": "6aaa3c1324c4adb80337308a", "imageUrl": "farah.jpg", "instruction": "Fill kldsfjlksdf in the gaps", "type": "gapText", "gapText": "Farah {is} nice and her mother too.", "options" : null };
    const response: AxiosResponse = await client.post(`/api/exercise`, data, config);
    console.log( response.data );
    console.log(response.status);
    console.log(response.data.json);    

    console.log(response.data.message );

  } catch(err) {
    console.log(err);
  }  
})();