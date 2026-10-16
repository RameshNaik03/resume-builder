// Turns an Axios error into a message we can show the user
export default function getErrorMessage(error) {
  if (error.response?.data?.message) {
    return error.response.data.message; // Message sent by our server
  }
  if (!error.response) {
    return "Can't reach the server. Please check your connection and try again.";
  }
  return "Something went wrong. Please try again.";
}
