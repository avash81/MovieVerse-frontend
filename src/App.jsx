import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Home from './components/Home';
import MovieDetails from './components/MovieDetails';

function App() {
  return (
    <HelmetProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movies/:source/:externalId" element={<MovieDetails />} />
        </Routes>
      </Router>
    </HelmetProvider>
  );
}

export default App;