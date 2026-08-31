import axios, { AxiosResponse, AxiosRequestConfig, RawAxiosRequestHeaders } from 'axios';
import { IExercise } from './src/models/LanguageLearningModel';

const client = axios.create({
  baseURL: 'http://localhost:8080',
});


(async () => {
  const config: AxiosRequestConfig = {
    headers: {
      'Accept': 'application/json',
    } as RawAxiosRequestHeaders,
  };
  
  try {
    const searchResponse: AxiosResponse = await client.get<IExercise[]>(`/api/exercise`, config);
    console.log(searchResponse);
    const exercises: IExercise[] = searchResponse.data;
    
    exercises.forEach ( (exercise: IExercise) => {
        console.log( exercise.gapText );
        
    });

   
  } catch(err) {
    console.log(err);
  }  
})();