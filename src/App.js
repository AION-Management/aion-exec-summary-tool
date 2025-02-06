// App.js
import React, { useState, useEffect, useRef } from 'react';
import { format, subMonths } from 'date-fns';
import _ from 'lodash';
import axios from 'axios';
import html2canvas from 'html2canvas';
import {
  Container, Paper, Typography, CircularProgress, Select, MenuItem, 
  Button, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Box, ThemeProvider, createTheme
} from '@mui/material';
import { PhotoCamera } from '@mui/icons-material';
import PROPERTIES from './properties';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' }
  }
});

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState('All Properties');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const tableRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/data');
      setData(response.data);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      console.error('API error:', err);
      setError("Error fetching data from server");
    } finally {
      setLoading(false);
    }
  };

  const processData = () => {
    const filteredData = selectedProperty === 'All Properties'
      ? data
      : data.filter(item => item.building_name === selectedProperty);

    return _.chain(filteredData)
      .groupBy('building_name')
      .map((buildingData, buildingName) => {
        const sources = _.groupBy(buildingData, 'marketing_source');

        return {
          buildingName,
          sources: _.map(sources, (sourceData, sourceName) => ({
            sourceName: sourceName || 'Unknown',
            leads: sourceData.filter(item => item.event_type === 'state').length,
            tours: sourceData.filter(item => 
              ['tour_attended', 'tour_booked'].includes(item.event_type)
            ).length,
            other: sourceData.filter(item => 
              !['state', 'tour_attended', 'tour_booked'].includes(item.event_type)
            ).length,
          })),
        };
      })
      .value();
  };

  const exportAsImage = async () => {
    if (tableRef.current) {
      try {
        const canvas = await html2canvas(tableRef.current);
        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = `leads-tours-report-${format(subMonths(new Date(), 1), 'MMMM-yyyy')}.png`;
        link.click();
      } catch (err) {
        console.error('Error exporting image:', err);
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" 
           justifyContent="center" minHeight="100vh" bgcolor="#f5f5f5">
        <CircularProgress size={60} />
        <Typography variant="h4" sx={{ mt: 4, mb: 2 }}>
          Preparing Your Report
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" 
           justifyContent="center" minHeight="100vh" bgcolor="#f5f5f5">
        <Typography variant="h6" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  const processedData = processData();
  const reportMonth = format(subMonths(new Date(), 1), 'MMMM yyyy');

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh', py: 4 }}>
        <Container maxWidth="lg">
          <Paper elevation={3} sx={{ p: 4 }}>
            <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} 
                 justifyContent="space-between" alignItems="center" mb={4}>
              <Box mb={{ xs: 2, md: 0 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                  Exec Summary Snapshot Tool
                </Typography>
                <Typography variant="h6" color="text.secondary">
                 Leads & Tours - {reportMonth}
                </Typography>
              </Box>
              <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }}>
                <Select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  sx={{ minWidth: 200 }}
                >
                  {PROPERTIES.map(property => (
                    <MenuItem key={property} value={property}>
                      {property}
                    </MenuItem>
                  ))}
                </Select>
                <Button
                  variant="contained"
                  onClick={exportAsImage}
                  startIcon={<PhotoCamera />}
                >
                  Export Image
                </Button>
              </Box>
            </Box>

            <TableContainer ref={tableRef}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Property</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell align="right">Leads</TableCell>
                    <TableCell align="right">Tours</TableCell>
                    
                  </TableRow>
                </TableHead>
                <TableBody>
                  {processedData.map((building) => (
                    building.sources.map((source, sourceIndex) => (
                      <TableRow key={`${building.buildingName}-${source.sourceName}`}>
                        {sourceIndex === 0 && (
                          <TableCell rowSpan={building.sources.length} 
                                   sx={{ bgcolor: 'grey.50' }}>
                            {building.buildingName}
                          </TableCell>
                        )}
                        <TableCell>{source.sourceName}</TableCell>
                        <TableCell align="right">{source.leads}</TableCell>
                        <TableCell align="right">{source.tours}</TableCell>
                 
                      </TableRow>
                    ))
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary" 
                      align="center" sx={{ mt: 2, display: 'block' }}>
              Last updated: {format(new Date(lastUpdated), 'MMM d, yyyy h:mm a')}
            </Typography>
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;