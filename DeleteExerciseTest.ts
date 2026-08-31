import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:8080',
});

async function deleteExercise(id: string): Promise<void> {
  try {
    await client.delete(`/api/exercise/${encodeURIComponent(id)}`);

    console.log('Exercise deleted successfully');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        'Delete failed:',
        error.response?.status,
        error.response?.data
      );
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

// Example:
deleteExercise('6a8fdb35be5dfba2464ceb56');
