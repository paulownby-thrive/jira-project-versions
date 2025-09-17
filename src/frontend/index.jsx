import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text, Box, Stack, Inline, Lozenge, Heading, Icon, Link, xcss } from '@forge/react';
import { Button, Modal, ModalBody, ModalTransition, ModalTitle, ModalFooter, ModalHeader} from "@forge/react";
import { Form, FormHeader, FormSection, FormFooter, Label, RequiredAsterisk, Textfield, Select } from '@forge/react';
import { requestJira, view } from '@forge/bridge';

// API Functions for Jira Integration
async function fetchReleasesJiraData(projectKey) {
  // Mock data for releases - will be replaced by real API call
  const mockReleases = [
    { 
      id: 10001, 
      name: "Version 1.0.0", 
      description: "Initial release", 
      archived: false, 
      released: false, 
      releaseDate: "2024-12-01", 
      projectId: 10000
    },
    { 
      id: 10002, 
      name: "Version 1.1.0", 
      description: "Feature update\nBug fixes", 
      archived: false, 
      released: true, 
      releaseDate: "2024-10-15", 
      projectId: 10000
    }
  ];

  try {
    const releasesResponse = await requestJira(`/rest/api/3/project/${projectKey}/versions`, { 
      headers: { 'Accept': 'application/json' } 
    });
    
    if (!releasesResponse.ok) {
      console.warn(`Failed to fetch releases data from Jira: ${releasesResponse.status} ${releasesResponse.statusText}`);
      return mockReleases;
    }
    
    const releasesData = await releasesResponse.json();
    console.log(`Releases data: ${JSON.stringify(releasesData)}`);
    return releasesData;
  } catch (error) {
    console.error('Error fetching releases Jira data:', error);
    return mockReleases;
  }
}
    
async function fetchEnvironmentsJiraData(projectKey) {
  // Mock data for environments
  const mockEnvironments = [
    { name: 'Development', url: 'https://dev.myapp.com', fixVersionId: 10001 },
    { name: 'Staging', url: 'https://staging.myapp.com', fixVersionId: 10002 },
    { name: 'Production', url: 'https://myapp.com', fixVersionId: 10002 }
  ];

  try {
    const environmentsResponse = await requestJira(`/rest/api/3/project/${projectKey}/properties/environments`, { 
      headers: { 'Accept': 'application/json' } 
    });
    
    if (!environmentsResponse.ok) {
      console.warn(`Failed to fetch environments data from Jira: ${environmentsResponse.status} ${environmentsResponse.statusText}`);
      return mockEnvironments;
    }
    
    const environmentsData = await environmentsResponse.json(); 
    console.log(`Environments data: ${JSON.stringify(environmentsData.value)}`);
    return environmentsData.value || mockEnvironments;
  } catch (error) {
    console.error('Error fetching environments Jira data:', error);
    return mockEnvironments;
  }
}

async function saveEnvironmentsJiraData(projectKey, environments) {
  try {
    const response = await requestJira(`/rest/api/3/project/${projectKey}/properties/environments`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(environments)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('Successfully saved environments data');
    return await response.text();
  } catch (error) {
    console.error('Error saving environments Jira data:', error);
    throw error;
  }
}

// Styled components using xcss
const cardStyle = xcss({
  backgroundColor: "elevation.surface.raised",
  borderRadius: "border.radius.200",
  padding: "space.200",
  boxShadow: "elevation.shadow.overlay",
  width: "500px"
});

const detailsBoxStyle = xcss({
  backgroundColor: "color.background.accent.gray.subtler",
  borderRadius: "border.radius.200",
  padding: "space.100"
});

const iconButtonStyle = xcss({
  padding: "space.075",
  minHeight: "32px",
  minWidth: "32px"
});

const linkStyle = xcss({
  color: "#0052CC",
  textDecoration: "none",
  fontWeight: "bold"
});

const App = () => {
  // State management
  const [releases, setReleases] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [projectKey, setProjectKey] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [fixVersion, setFixVersion] = useState('');
  const [modalType, setModalType] = useState('add'); // 'add' or 'edit'
  const [editingIndex, setEditingIndex] = useState(null);

  // Delete Confirmation state
  // Add these with your other useState declarations
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [deleteEnvironmentName, setDeleteEnvironmentName] = useState('');

  // Create options for the version select dropdown
  const fixVersionOptions = releases.map(release => ({
    label: release.name,
    value: release.id
  }));

  // Modal handlers
  const openModal = (type = 'add', index = null) => {
    setModalType(type);
    setEditingIndex(index);
    
    if (type === 'edit' && index !== null) {
      const env = environments[index];
      setName(env.name);
      setUrl(env.url);
      const selectedVersion = fixVersionOptions.find(option => option.value === env.fixVersionId);
      setFixVersion(selectedVersion || '');
    }
    
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setName('');
    setUrl('');
    setFixVersion('');
    setEditingIndex(null);
  };

  // Delete Modal functions
    const openDeleteModal = (index) => {
    setDeleteIndex(index);
    setDeleteEnvironmentName(environments[index].name);
    setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteIndex(null);
    setDeleteEnvironmentName('');
    };

    const confirmDelete = async () => {
    if (deleteIndex !== null) {
        await handleDelete(deleteIndex);
        closeDeleteModal();
    }
    };

  // Form submission
  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError(null);
      
      if (modalType === 'add') {
        const newEnvironment = {
          name: name.trim(),
          url: url.trim(),
          fixVersionId: fixVersion.value
        };
        const updatedEnvironments = [...environments, newEnvironment];
        setEnvironments(updatedEnvironments);
        await saveEnvironmentsJiraData(projectKey, updatedEnvironments);
      } else if (modalType === 'edit') {
        const updatedEnvironments = [...environments];
        updatedEnvironments[editingIndex] = {
          name: name.trim(),
          url: url.trim(),
          fixVersionId: fixVersion.value
        };
        setEnvironments(updatedEnvironments);
        await saveEnvironmentsJiraData(projectKey, updatedEnvironments);
      }
      
      console.log('Environment saved successfully');
      closeModal();
    } catch (error) {
      console.error('Error saving environment:', error);
      setError('Failed to save environment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Delete environment
  const handleDelete = async (index) => {
    try {
      setSaving(true);
      setError(null);
      
      const updatedEnvironments = environments.filter((_, i) => i !== index);
      setEnvironments(updatedEnvironments);
      await saveEnvironmentsJiraData(projectKey, updatedEnvironments);
      
      console.log('Environment deleted successfully');
    } catch (error) {
      console.error('Error deleting environment:', error);
      setError('Failed to delete environment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Form validation
  const isFormValid = name.trim() && url.trim() && fixVersion;

  // Load data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get the current project context
        const context = await view.getContext();
        const currentProjectKey = context?.extension?.project?.key;
        console.log(`Current project key: ${currentProjectKey}`);
        
        if (!currentProjectKey) {
          throw new Error('Unable to determine current project key');
        }
        
        setProjectKey(currentProjectKey);
        
        // Fetch releases and environments in parallel
        const [releasesData, environmentsData] = await Promise.all([
          fetchReleasesJiraData(currentProjectKey),
          fetchEnvironmentsJiraData(currentProjectKey)
        ]);
        
        setReleases(releasesData || []);
        setEnvironments(environmentsData || []);
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Create a map for quick release lookup
  const releaseMap = new Map();
  console.log(`Releases: ${JSON.stringify(releases)}`);
  releases.forEach(r => releaseMap.set(r.id, r));

  // Loading state
  if (loading) {
    return (
      <Box>
        <Heading size="large">Project Versions</Heading>
        <Inline space="space.100" alignBlock="center">
          <Icon glyph="spinner" size="small" />
          <Text>Loading project data...</Text>
        </Inline>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box>
        <Heading size="large">Project Versions</Heading>
        <Inline space="space.100" alignBlock="center">
          <Icon glyph="warning" size="small" />
          <Text>Error: {error}</Text>
        </Inline>
      </Box>
    );
  }

  // Main render
  return (
    <>
      <Stack space="space.200">

        
        {environments.length === 0 && (
          <Box>
            <Inline space="space.100" alignBlock="center">
              <Icon glyph="info" size="small" />
              <Text>No environments configured yet. Add your first environment to get started!</Text>
            </Inline>
          </Box>
        )}
        
        <Inline space='space.200' shouldWrap grow="fill">
          {environments.map((env, index) => {
            const release = releaseMap.get(env.fixVersionId);
            
            return (
              <Box key={`${env.name}-${index}`} xcss={cardStyle}>
                <Stack space="space.100">
                  <Inline spread='space-between' alignBlock="center">
                    <Inline space="space.100" alignBlock="center">
                      <Icon glyph="world" size="small" />
                      <Heading size="medium">{env.name}</Heading>
                      <Lozenge appearance={release && release.released ? "success" : "inprogress"}>
                        {release && release.released ? "LIVE" : "IN PROGRESS"}</Lozenge>
                    </Inline>
                    <Inline space="space.10" alignBlock="center">
                      <Button 
                        appearance="subtle" 
                        spacing="compact"
                        onClick={() => openModal('edit', index)}
                        isDisabled={saving}
                        xcss={iconButtonStyle}
                      >
                        <Icon glyph="edit-filled" size="small" />
                      </Button>
                      <Button 
                        appearance="subtle" 
                        spacing="compact"
                        onClick={() => openDeleteModal(index)}
                        isDisabled={saving}
                        xcss={iconButtonStyle}
                      >
                        <Icon glyph="trash" size="small" />
                      </Button>
                    </Inline>
                  </Inline>
                  
                  <Inline space="space.100" alignBlock="center">
                    <Icon glyph="link" size="small" />
                    <Text>{env.url}</Text>
                  </Inline>
                  
                  {release && (
                    <Box xcss={detailsBoxStyle}>
                      <Stack space='space.100'> 
                        <Inline spread='space-between' alignBlock="center">
                          <Inline space="space.100" alignBlock="center">
                            <Icon glyph="tag" size="small" />
                            <Heading size="xsmall">{release.name}</Heading>
                            <Link href={`/projects/${projectKey}/versions/${release.id}`} xcss={linkStyle} ><Icon glyph="link" size="small" /></Link>
                          </Inline>
                          {release.releaseDate && (
                            <Inline space="space.100" alignBlock='center'>
                              <Icon glyph="calendar" size="small" />
                              <Text>{release.releaseDate}</Text>
                            </Inline>
                          )}
                        </Inline>
                        
                        {release.description && (
                          <Stack space="space.050">
                            <Inline space="space.100" alignBlock="start">
                              <Icon glyph="page" size="small" />
                              <Stack>
                            {release.description.split('\n').map((line, lineIndex) => (
                              <Text key={lineIndex} size="small">{line}</Text>

                            ))}
                                </Stack>
                            </Inline>
                          </Stack>
                        )}
                      </Stack>
                    </Box>
                  )}
                  
                  {!release && (
                    <Box xcss={detailsBoxStyle}>
                      <Inline space="space.100" alignBlock="center">
                        <Icon glyph="warning" size="small" />
                        <Text>No version information available</Text>
                      </Inline>
                    </Box>
                  )}
                </Stack>
              </Box>
            );
          })}
        </Inline>
        
        <Box>
          <Button 
            appearance='primary' 
            onClick={() => openModal('add')}
            isDisabled={saving}
          >
            <Inline space="space.100" alignBlock="center">
              <Icon glyph="add" size="small" />
              <Text>Add Environment</Text>
            </Inline>
          </Button>
        </Box>
        
        {error && (
          <Box>
            <Inline space="space.100" alignBlock="center">
              <Icon glyph="error" size="small" />
              <Text>{error}</Text>
            </Inline>
          </Box>
        )}
      </Stack>
      
      {/* Add/Edit Modal */}
      <ModalTransition>
        {isModalOpen && (
          <Modal onClose={closeModal} width="medium">
            <ModalHeader>
              <ModalTitle>
                <Inline space="space.100" alignBlock="center">
                  <Icon glyph={modalType === 'add' ? 'add' : 'edit-filled'} size="medium" />
                  <Text>{modalType === 'add' ? 'Add New Environment' : 'Edit Environment'}</Text>
                </Inline>
              </ModalTitle>
            </ModalHeader>
            <ModalBody>
              <Form onSubmit={handleSubmit}>
                <FormHeader 
                  title={modalType === 'add' ? 'Add New Environment' : 'Edit Environment'} 
                  description="Configure the environment details and associate it with a project version." 
                />
                <FormSection>
                  <Stack space="space.200">
                    <Stack space="space.050">
                      <Label labelfor="name">
                        <Inline space="space.100" alignBlock="center">
                          <Icon glyph="world" size="small" />
                          <Text>Environment Name<RequiredAsterisk /></Text>
                        </Inline>
                      </Label>
                      <Textfield
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Development, Staging, Production"
                        isRequired
                      />
                    </Stack>
                    
                    <Stack space="space.050">
                      <Label labelfor="url">
                        <Inline space="space.100" alignBlock="center">
                          <Icon glyph="link" size="small" />
                          <Text>Environment URL<RequiredAsterisk /></Text>
                        </Inline>
                      </Label>
                      <Textfield
                        id="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}  
                        placeholder="e.g., https://myapp.com"
                        isRequired
                      />
                    </Stack>
                    
                    <Stack space="space.050">
                      <Label labelfor="fixVersion">
                        <Inline space="space.100" alignBlock="center">
                          <Icon glyph="tag" size="small" />
                          <Text>Project Version<RequiredAsterisk /></Text>
                        </Inline>
                      </Label>
                      <Select
                        id="fixVersion"
                        options={fixVersionOptions}
                        placeholder="Select a project version..."
                        value={fixVersion}
                        onChange={setFixVersion}
                        isRequired
                      />
                    </Stack>
                  </Stack>
                </FormSection>
                <FormFooter>
                    <Inline space="space.100" alignBlock="center">
                  <Button onClick={closeModal} isDisabled={saving}>
                    <Inline space="space.100" alignBlock="center">
                      <Icon glyph="cross" size="small" />
                      <Text>Cancel</Text>
                    </Inline>
                  </Button>
                  <Button 
                    appearance='primary' 
                    onClick={handleSubmit} 
                    isDisabled={!isFormValid || saving}
                    isLoading={saving}
                  >
                    <Inline space="space.100" alignBlock="center">
                      <Icon glyph={modalType === 'add' ? 'add' : 'check'} size="small" />
                      <Text>{modalType === 'add' ? 'Add Environment' : 'Update Environment'}</Text>
                    </Inline>
                  </Button>
                  </Inline>
                </FormFooter>
              </Form>
            </ModalBody>
            <ModalFooter />
          </Modal>
        )}
      </ModalTransition>  



        {/* Delete Confirmation Modal */}
        <ModalTransition>
        {isDeleteModalOpen && (
            <Modal onClose={closeDeleteModal} width="small">
            <ModalHeader>
                <ModalTitle>
                <Inline space="space.100" alignBlock="center">
                    <Icon glyph="warning" size="medium" />
                    <Text>Confirm Delete</Text>
                </Inline>
                </ModalTitle>
            </ModalHeader>
            <ModalBody>
                <Stack space="space.200">
                <Text>Are you sure you want to delete the environment:</Text>
                <Inline alignBlock='center'  space='space.100'><Icon glyph="world" /><Text size="large" weight="bold" >    {deleteEnvironmentName}</Text></Inline>
                <Text size="small">This action cannot be undone.</Text>
                </Stack>
            </ModalBody>
            <ModalFooter>
                <Inline grow="fill" spread="space-between" alignBlock="center" >
                <Button onClick={closeDeleteModal} isDisabled={saving}>
                <Inline space="space.100" alignBlock="center">
                    <Icon glyph="cross" size="small" />
                    <Text>Cancel</Text>
                </Inline>
                </Button>
                <Button 
                appearance="danger"
                onClick={confirmDelete}
                isDisabled={saving}
                isLoading={saving}
                >
                <Inline space="space.100" alignBlock="center">
                    <Icon glyph="trash" size="small" />
                    <Text>Delete Environment</Text>
                </Inline>
                </Button>
                </Inline>
            </ModalFooter>
            </Modal>
        )}
        </ModalTransition>




    </>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);