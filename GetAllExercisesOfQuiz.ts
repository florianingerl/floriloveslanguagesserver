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
    const quizid = "6a97c59f894828561586b01d"; //It is the quizid of the Italian quiz !!
    const searchResponse: AxiosResponse = await client.get<IExercise[]>(`/api/exercise/${quizid}`, config);
    console.log(searchResponse);
    const exercises: IExercise[] = searchResponse.data;
    
    exercises.forEach ( (exercise: IExercise) => {
        console.log( exercise.gapText );
        
    });

   
  } catch(err) {
    console.log(err);
  }  
})();