import axios, { AxiosResponse, AxiosRequestConfig, RawAxiosRequestHeaders } from 'axios';
import { ITopic } from './src/models/LanguageLearningModel';

const client = axios.create({
  baseURL: 'http://localhost:8080',
});

type emailOwner = {
 email: string
}


(async () => {
  const config: AxiosRequestConfig = {
    headers: {
      'Accept': 'application/json',
    } as RawAxiosRequestHeaders,
  };
  
  try {
    const searchResponse: AxiosResponse = await client.get(`/api/topic`, config);
    console.log(searchResponse);
    const topics: ITopic[] = searchResponse.data;
    
    topics.forEach ( (topic: ITopic) => {
        console.log(topic.title );
      
    });

   
  } catch(err) {
    console.log(err);
  }  
})();