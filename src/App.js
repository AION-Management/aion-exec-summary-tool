import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { jsPDF } from 'jspdf';
import _ from 'lodash';
import PROPERTIES from './properties'; // Make sure this path is correct
import {
  Container,
  Paper,
  Typography,
  CircularProgress,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import { PictureAsPdf } from '@mui/icons-material';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
  },
});

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState('All Properties');
  const [lastUpdated, setLastUpdated] = useState(null); // Initialize as null
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { startDate, endDate } = getDateRange(1); // Get date range (adjust as needed)

      const response = await axios.get(
        'https://app.meetelise.com/reportingApi/leasing/generateReport/events',
        {
          params: {
            start_date: startDate,
            end_date: endDate,
          },
          headers: {
            'X-SecurityKey': 'ef9329a061f9c69e31455d12a31e0e3c',
          },
        }
      );

        // Check API format
        let events;
        if (typeof response.data === 'string') { // If it's a string, parse (if needed)
            events = response.data.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
        } else if (Array.isArray(response.data)) { // If it's already an array of JSON objects
            events = response.data;
        } else {
            throw new Error("Unexpected API response format.");
        }

      setData(events);
      setLastUpdated(new Date().toISOString()); // Update lastUpdated
    } catch (error) {
      console.error('Error fetching data:', error);
      setError("Error fetching data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = (daysToLookBack = 1) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToLookBack);

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
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
            sourceName: sourceName || 'Unknown', // Handle missing marketing_source
            leads: sourceData.filter(item => item.event_type === 'state').length,
            tours: sourceData.filter(item => item.event_type === 'tour_attended').length,
            other: sourceData.filter(item => !['state', 'tour_attended'].includes(item.event_type)).length,
          })),
        };
      })
      .value();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const element = document.getElementById('report-content');
    doc.html(element, {
      callback: function (doc) {
        doc.save(`leads-tours-report-${format(subMonths(new Date(), 1), 'MMMM-yyyy')}.pdf`);
      },
      x: 15,
      y: 15,
      width: 170,
      windowWidth: 650,
    });
  };

  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        bgcolor="#f5f5f5"
      >
        <CircularProgress size={60} />
        <Typography variant="h4" sx={{ mt: 4, mb: 2 }}>
          Preparing Your Report
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Loading data...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        bgcolor="#f5f5f5"
      >
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
          <Paper elevation={3} sx={{ p: 4 }} id="report-content">
            <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" mb={4}>
              <Box mb={{ xs: 2, md: 0 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                  Leads and Tours Report
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  {reportMonth}
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
                  onClick={exportToPDF}
                  startIcon={<PictureAsPdf />}
                >
                  Export PDF
                </Button>
              </Box>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Property</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell align="right">Leads</TableCell>
                    <TableCell align="right">Tours</TableCell>
                    <TableCell align="right">Tour %</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {processedData.map((building) => (
                    building.sources.map((source, sourceIndex) => (
                      <TableRow key={`${building.buildingName}-${source.sourceName}`}>
                        {sourceIndex === 0 && (
                          <TableCell
                            rowSpan={building.sources.length}
                            sx={{ bgcolor: 'grey.50' }}
                          >
                            {building.buildingName}
                          </TableCell>
                        )}
                        <TableCell>{source.sourceName || 'Unknown'}</TableCell>
                        <TableCell align="right">{source.leads}</TableCell>
                        <TableCell align="right">{source.tours}</TableCell>
                        <TableCell align="right">
                          {source.leads ? `${((source.tours / source.leads) * 100).toFixed(1)}%` : '0%'}
                        </TableCell>
                      </TableRow>
                    ))
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary" align="center" sx={{ mt: 2, display: 'block' }}>
              Last updated: {format(new Date(lastUpdated), 'MMM d, yyyy h:mm a')}
            </Typography>
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;


