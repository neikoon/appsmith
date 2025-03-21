package com.appsmith.server.services;

import com.appsmith.external.models.ApiKeyAuth;
import com.appsmith.external.models.BasicAuth;
import com.appsmith.external.models.DBAuth;
import com.appsmith.external.models.Datasource;
import com.appsmith.external.models.DatasourceConfiguration;
import com.appsmith.external.models.DatasourceStorage;
import com.appsmith.external.models.DatasourceStorageDTO;
import com.appsmith.external.models.UpdatableConnection;
import com.appsmith.external.plugins.PluginExecutor;
import com.appsmith.external.services.EncryptionService;
import com.appsmith.server.domains.DatasourceContext;
import com.appsmith.server.domains.DatasourceContextIdentifier;
import com.appsmith.server.domains.Plugin;
import com.appsmith.server.domains.User;
import com.appsmith.server.domains.Workspace;
import com.appsmith.server.helpers.MockPluginExecutor;
import com.appsmith.server.helpers.PluginExecutorHelper;
import com.appsmith.server.repositories.DatasourceRepository;
import com.appsmith.server.repositories.NewActionRepository;
import com.appsmith.server.repositories.WorkspaceRepository;
import com.appsmith.server.solutions.DatasourcePermission;
import com.appsmith.server.solutions.EnvironmentPermission;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.security.test.context.support.WithUserDetails;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.util.StringUtils;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.util.HashMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.spy;

@ExtendWith(SpringExtension.class)
@SpringBootTest
@Slf4j
public class DatasourceContextServiceTest {

    @Autowired
    EncryptionService encryptionService;

    @Autowired
    WorkspaceRepository workspaceRepository;

    @SpyBean
    PluginService pluginService;

    @Autowired
    DatasourceService datasourceService;

    @SpyBean
    DatasourceStorageService datasourceStorageService;

    @SpyBean
    DatasourceRepository datasourceRepository;

    @SpyBean
    NewActionRepository newActionRepository;

    @Autowired
    UserService userService;

    @Autowired
    WorkspaceService workspaceService;

    @Autowired
    DatasourcePermission datasourcePermission;

    @MockBean
    PluginExecutorHelper pluginExecutorHelper;

    @SpyBean
    DatasourceContextServiceImpl datasourceContextService;

    @Autowired
    EnvironmentPermission environmentPermission;

    String defaultEnvironmentId;

    String workspaceId;

    @BeforeEach
    @WithUserDetails(value = "api_user")
    public void setup() {
        User apiUser = userService.findByEmail("api_user").block();
        Workspace toCreate = new Workspace();
        toCreate.setName("DatasourceServiceTest");

        if (!StringUtils.hasLength(workspaceId)) {
            Workspace workspace =
                    workspaceService.create(toCreate, apiUser, Boolean.FALSE).block();
            workspaceId = workspace.getId();
            defaultEnvironmentId = workspaceService
                    .getDefaultEnvironmentId(workspaceId, environmentPermission.getExecutePermission())
                    .block();
        }
    }

    @Test
    @WithUserDetails(value = "api_user")
    public void testDatasourceCache_afterDatasourceDeleted_doesNotReturnOldConnection() {
        // Never require the datasource connection to be stale
        doReturn(false).doReturn(false).when(datasourceContextService).getIsStale(any(), any());

        MockPluginExecutor mockPluginExecutor = new MockPluginExecutor();
        MockPluginExecutor spyMockPluginExecutor = spy(mockPluginExecutor);
        /* Return two different connection objects if `datasourceCreate` method is called twice */
        doReturn(Mono.just("connection_1"))
                .doReturn(Mono.just("connection_2"))
                .when(spyMockPluginExecutor)
                .datasourceCreate(any());
        Mockito.when(pluginExecutorHelper.getPluginExecutor(any())).thenReturn(Mono.just(spyMockPluginExecutor));

        DatasourceStorage datasourceStorage = new DatasourceStorage();
        datasourceStorage.setEnvironmentId(defaultEnvironmentId);
        datasourceStorage.setDatasourceId("id1");
        datasourceStorage.setDatasourceConfiguration(new DatasourceConfiguration());
        datasourceStorage.setWorkspaceId(workspaceId);

        DatasourceContextIdentifier datasourceContextIdentifier =
                new DatasourceContextIdentifier(datasourceStorage.getDatasourceId(), null);

        Object monitor = new Object();
        // Create one instance of datasource connection
        Mono<DatasourceContext<?>> dsContextMono1 = datasourceContextService.getCachedDatasourceContextMono(
                datasourceStorage, spyMockPluginExecutor, monitor, datasourceContextIdentifier);

        Datasource datasource = new Datasource();
        datasource.setId("id1");
        datasource.setWorkspaceId("workspaceId1");
        datasource.setPluginId("mockPluginId");
        HashMap<String, DatasourceStorageDTO> storages = new HashMap<>();
        storages.put(defaultEnvironmentId, new DatasourceStorageDTO(datasourceStorage));
        datasource.setDatasourceStorages(storages);

        doReturn(Mono.just(datasource))
                .when(datasourceRepository)
                .findById("id1", datasourcePermission.getDeletePermission());
        doReturn(Mono.just(datasource))
                .when(datasourceRepository)
                .findById("id1", datasourcePermission.getExecutePermission());
        doReturn(Mono.just(new Plugin())).when(pluginService).findById("mockPlugin");
        doReturn(Mono.just(0L)).when(newActionRepository).countByDatasourceId("id1");
        doReturn(Mono.just(datasource)).when(datasourceRepository).archiveById("id1");
        doReturn(Flux.just(datasourceStorage)).when(datasourceStorageService).findStrictlyByDatasourceId("id1");
        doReturn(Mono.just(datasourceStorage)).when(datasourceStorageService).archive(datasourceStorage);

        // Now delete the datasource and check if the cache retains the same instance of connection
        Mono<DatasourceContext<?>> dsContextMono2 = datasourceService
                .archiveById("id1")
                .flatMap(deleted -> datasourceContextService.getCachedDatasourceContextMono(
                        datasourceStorage, spyMockPluginExecutor, monitor, datasourceContextIdentifier));

        StepVerifier.create(dsContextMono1)
                .assertNext(dsContext1 -> {
                    assertEquals("connection_1", dsContext1.getConnection());
                })
                .verifyComplete();

        StepVerifier.create(dsContextMono2)
                .assertNext(dsContext1 -> {
                    assertEquals("connection_2", dsContext1.getConnection());
                })
                .verifyComplete();
    }

    @Test
    @WithUserDetails(value = "api_user")
    public void checkDecryptionOfAuthenticationDTOTest() {
        Mockito.when(pluginExecutorHelper.getPluginExecutor(Mockito.any()))
                .thenReturn(Mono.just(new MockPluginExecutor()));

        User apiUser = userService.findByEmail("api_user").block();
        Workspace toCreate = new Workspace();
        toCreate.setName("checkDecryptionOfAuthenticationDTOTest");

        Workspace workspace =
                workspaceService.create(toCreate, apiUser, Boolean.FALSE).block();
        String workspaceId = workspace.getId();
        String defaultEnvironmentId = workspaceService
                .getDefaultEnvironmentId(workspaceId, environmentPermission.getExecutePermission())
                .block();

        Mono<Plugin> pluginMono = pluginService.findByPackageName("restapi-plugin");
        Datasource datasource = new Datasource();
        datasource.setName("test datasource name for authenticated fields decryption test");
        DatasourceConfiguration datasourceConfiguration = new DatasourceConfiguration();
        datasourceConfiguration.setUrl("http://test.com");
        DBAuth authenticationDTO = new DBAuth();
        String username = "username";
        String password = "password";
        authenticationDTO.setUsername(username);
        authenticationDTO.setPassword(password);
        datasourceConfiguration.setAuthentication(authenticationDTO);
        datasource.setWorkspaceId(workspaceId);

        DatasourceStorageDTO datasourceStorageDTO = new DatasourceStorageDTO();
        datasourceStorageDTO.setDatasourceConfiguration(datasourceConfiguration);
        datasourceStorageDTO.setEnvironmentId(defaultEnvironmentId);
        datasourceStorageDTO.setIsConfigured(Boolean.TRUE);

        HashMap<String, DatasourceStorageDTO> storages = new HashMap<>();
        storages.put(defaultEnvironmentId, datasourceStorageDTO);
        datasource.setDatasourceStorages(storages);

        final Datasource createdDatasource = pluginMono
                .map(plugin -> {
                    datasource.setPluginId(plugin.getId());
                    return datasource;
                })
                .flatMap(datasourceService::create)
                .block();

        assert createdDatasource != null;
        Mono<DatasourceStorage> datasourceStorageMono = datasourceService
                .findById(createdDatasource.getId())
                .flatMap(datasource1 ->
                        datasourceStorageService.findByDatasourceAndEnvironmentId(datasource1, defaultEnvironmentId));

        StepVerifier.create(datasourceStorageMono)
                .assertNext(savedDatasource -> {
                    DBAuth authentication = (DBAuth)
                            savedDatasource.getDatasourceConfiguration().getAuthentication();
                    assertEquals(password, authentication.getPassword());

                    DatasourceStorageDTO savedDatasourceStorageDTO =
                            createdDatasource.getDatasourceStorages().get(defaultEnvironmentId);
                    DBAuth encryptedAuthentication = (DBAuth) savedDatasourceStorageDTO
                            .getDatasourceConfiguration()
                            .getAuthentication();
                    assertEquals(password, encryptionService.decryptString(encryptedAuthentication.getPassword()));
                })
                .verifyComplete();
    }

    @Test
    @WithUserDetails(value = "api_user")
    public void checkDecryptionOfAuthenticationDTONullPassword() {
        Mockito.when(pluginExecutorHelper.getPluginExecutor(Mockito.any()))
                .thenReturn(Mono.just(new MockPluginExecutor()));

        User apiUser = userService.findByEmail("api_user").block();
        Workspace toCreate = new Workspace();
        toCreate.setName("checkDecryptionOfAuthenticationDTONullPassword");

        Workspace workspace =
                workspaceService.create(toCreate, apiUser, Boolean.FALSE).block();
        String workspaceId = workspace.getId();
        String defaultEnvironmentId = workspaceService
                .getDefaultEnvironmentId(workspaceId, environmentPermission.getExecutePermission())
                .block();

        Mono<Plugin> pluginMono = pluginService.findByPackageName("restapi-plugin");
        Datasource datasource = new Datasource();
        datasource.setName("test datasource name for authenticated fields decryption test null password");
        DatasourceConfiguration datasourceConfiguration = new DatasourceConfiguration();
        datasourceConfiguration.setUrl("http://test.com");
        DBAuth authenticationDTO = new DBAuth();
        datasourceConfiguration.setAuthentication(authenticationDTO);
        datasource.setDatasourceConfiguration(datasourceConfiguration);
        datasource.setWorkspaceId(workspaceId);
        DatasourceStorage datasourceStorage = new DatasourceStorage(datasource, defaultEnvironmentId);
        HashMap<String, DatasourceStorageDTO> storages = new HashMap<>();
        storages.put(defaultEnvironmentId, new DatasourceStorageDTO(datasourceStorage));
        datasource.setDatasourceStorages(storages);

        final Datasource createdDatasource = pluginMono
                .map(plugin -> {
                    datasource.setPluginId(plugin.getId());
                    return datasource;
                })
                .flatMap(datasourceService::create)
                .block();

        assert createdDatasource != null;
        Mono<DatasourceStorage> datasourceStorageMono = datasourceService
                .findById(createdDatasource.getId())
                .flatMap(datasource1 ->
                        datasourceStorageService.findByDatasourceAndEnvironmentId(datasource1, defaultEnvironmentId));

        StepVerifier.create(datasourceStorageMono)
                .assertNext(savedDatasource -> {
                    DBAuth authentication = (DBAuth)
                            savedDatasource.getDatasourceConfiguration().getAuthentication();
                    assertNull(authentication.getPassword());

                    DatasourceStorageDTO datasourceStorageDTO =
                            createdDatasource.getDatasourceStorages().get(defaultEnvironmentId);
                    DBAuth encryptedAuthentication = (DBAuth)
                            datasourceStorageDTO.getDatasourceConfiguration().getAuthentication();
                    assertNull(encryptedAuthentication.getPassword());
                })
                .verifyComplete();
    }

    /**
     * This test checks that if `getCachedDatasourceCreate` method is called two times for the same datasource id, then
     * the datasource creation only happens once.
     */
    @Test
    @WithUserDetails(value = "api_user")
    public void testCachedDatasourceCreate() {
        doReturn(false).doReturn(false).when(datasourceContextService).getIsStale(any(), any());

        MockPluginExecutor mockPluginExecutor = new MockPluginExecutor();
        MockPluginExecutor spyMockPluginExecutor = spy(mockPluginExecutor);
        /* Return two different connection objects if `datasourceCreate` method is called twice */
        doReturn(Mono.just("connection_1"))
                .doReturn(Mono.just("connection_2"))
                .when(spyMockPluginExecutor)
                .datasourceCreate(any());

        DatasourceStorage datasourceStorage = new DatasourceStorage();
        datasourceStorage.setEnvironmentId(defaultEnvironmentId);
        datasourceStorage.setDatasourceId("id2");
        datasourceStorage.setDatasourceConfiguration(new DatasourceConfiguration());

        DatasourceContextIdentifier datasourceContextIdentifier =
                new DatasourceContextIdentifier(datasourceStorage.getDatasourceId(), defaultEnvironmentId);

        Object monitor = new Object();
        DatasourceContext<?> dsContext1 = (DatasourceContext<?>) datasourceContextService
                .getCachedDatasourceContextMono(
                        datasourceStorage, spyMockPluginExecutor, monitor, datasourceContextIdentifier)
                .block();
        DatasourceContext<?> dsContext2 = (DatasourceContext<?>) datasourceContextService
                .getCachedDatasourceContextMono(
                        datasourceStorage, spyMockPluginExecutor, monitor, datasourceContextIdentifier)
                .block();

        /* They can only be equal if the `datasourceCreate` method was called only once */
        assertEquals(dsContext1.getConnection(), dsContext2.getConnection());
        assertEquals("connection_1", dsContext1.getConnection());
    }

    /**
     * This test checks that if `getCachedDatasourceCreate` method is called two times for the same datasource id, then
     * the datasource creation happens again and again for UpdatableConnection types
     */
    @Test
    @WithUserDetails(value = "api_user")
    public void testDatasourceCreate_withUpdatableConnection_recreatesConnectionAlways() {
        MockPluginExecutor mockPluginExecutor = new MockPluginExecutor();
        Mockito.when(pluginExecutorHelper.getPluginExecutor(Mockito.any())).thenReturn(Mono.just(mockPluginExecutor));

        MockPluginExecutor spyMockPluginExecutor = spy(mockPluginExecutor);
        /* Return two different connection objects if `datasourceCreate` method is called twice */
        doReturn(Mono.just((UpdatableConnection) auth -> new DBAuth()))
                .doReturn(Mono.just((UpdatableConnection) auth -> new BasicAuth()))
                .when(spyMockPluginExecutor)
                .datasourceCreate(any());

        User apiUser = userService.findByEmail("api_user").block();
        Workspace toCreate = new Workspace();
        toCreate.setName("testDatasourceCreate_withUpdatableConnection_recreatesConnectionAlways");

        Workspace workspace =
                workspaceService.create(toCreate, apiUser, Boolean.FALSE).block();
        String workspaceId = workspace.getId();
        String defaultEnvironmentId = workspaceService
                .getDefaultEnvironmentId(workspaceId, environmentPermission.getExecutePermission())
                .block();

        Mono<Plugin> pluginMono = pluginService.findByPackageName("restapi-plugin");
        Datasource datasource = new Datasource();
        datasource.setName("test datasource name for updatable connection test");
        DatasourceConfiguration datasourceConfiguration = new DatasourceConfiguration();
        datasourceConfiguration.setUrl("http://test.com");
        DBAuth authenticationDTO = new DBAuth();
        String username = "username";
        String password = "password";
        authenticationDTO.setUsername(username);
        authenticationDTO.setPassword(password);
        datasourceConfiguration.setAuthentication(authenticationDTO);
        datasource.setDatasourceConfiguration(datasourceConfiguration);
        datasource.setWorkspaceId(workspaceId);
        DatasourceStorage datasourceStorage = new DatasourceStorage(datasource, defaultEnvironmentId);
        HashMap<String, DatasourceStorageDTO> storages = new HashMap<>();
        storages.put(defaultEnvironmentId, new DatasourceStorageDTO(datasourceStorage));
        datasource.setDatasourceStorages(storages);

        final Datasource createdDatasource = pluginMono
                .map(plugin -> {
                    datasource.setPluginId(plugin.getId());
                    return datasource;
                })
                .flatMap(datasourceService::create)
                .block();

        assert createdDatasource != null;

        DatasourceStorageDTO datasourceStorageDTO =
                createdDatasource.getDatasourceStorages().get(defaultEnvironmentId);
        assert datasourceStorageDTO != null;

        DatasourceStorage createdDatasourceStorage = new DatasourceStorage(datasourceStorageDTO);

        DatasourceContextIdentifier datasourceContextIdentifier =
                new DatasourceContextIdentifier(createdDatasource.getId(), defaultEnvironmentId);

        Object monitor = new Object();
        final DatasourceContext<?> dsc1 = (DatasourceContext) datasourceContextService
                .getCachedDatasourceContextMono(
                        createdDatasourceStorage, spyMockPluginExecutor, monitor, datasourceContextIdentifier)
                .block();
        assertNotNull(dsc1);
        assertTrue(dsc1.getConnection() instanceof UpdatableConnection);
        assertTrue(
                ((UpdatableConnection) dsc1.getConnection()).getAuthenticationDTO(new ApiKeyAuth()) instanceof DBAuth);

        final DatasourceContext<?> dsc2 = (DatasourceContext) datasourceContextService
                .getCachedDatasourceContextMono(
                        createdDatasourceStorage, spyMockPluginExecutor, monitor, datasourceContextIdentifier)
                .block();
        assertNotNull(dsc2);
        assertTrue(dsc2.getConnection() instanceof UpdatableConnection);
        assertTrue(
                ((UpdatableConnection) dsc2.getConnection()).getAuthenticationDTO(new ApiKeyAuth())
                        instanceof BasicAuth);
    }

    /**
     * This test checks that if a cached datasource Mono goes to error state, then the datasource context is
     * considered invalid.
     */
    @Test
    @WithUserDetails(value = "api_user")
    public void testDatasourceContextIsInvalid_whenCachedDatasourceContextMono_isInErrorState() {
        doReturn(false).when(datasourceContextService).getIsStale(any(), any());

        MockPluginExecutor mockPluginExecutor = new MockPluginExecutor();
        MockPluginExecutor spyMockPluginExecutor = spy(mockPluginExecutor);

        // Introduce an error to fail the datasource context mono
        doReturn(Mono.error(new RuntimeException("error")))
                .when(spyMockPluginExecutor)
                .datasourceCreate(any());

        DatasourceStorage datasourceStorage = new DatasourceStorage();
        datasourceStorage.setEnvironmentId(defaultEnvironmentId);
        datasourceStorage.setDatasourceId("error_datasource_1");
        datasourceStorage.setDatasourceConfiguration(new DatasourceConfiguration());

        DatasourceContextIdentifier datasourceContextIdentifier =
                new DatasourceContextIdentifier(datasourceStorage.getDatasourceId(), defaultEnvironmentId);

        Object monitor = new Object();

        Mono<DatasourceContext<?>> failedDatasourceContextMono =
                datasourceContextService.getCachedDatasourceContextMono(
                        datasourceStorage, spyMockPluginExecutor, monitor, datasourceContextIdentifier);

        StepVerifier.create(failedDatasourceContextMono)
                .expectError(RuntimeException.class)
                .verify();

        assertFalse(datasourceContextService.isValidDatasourceContextAvailable(
                datasourceStorage, datasourceContextIdentifier));
    }

    /**
     * This test verifies that if a cached datasource context Mono goes to an error state, then that Mono is invalidated
     * and a new datasource context mono is created on calling
     * {@link com.appsmith.server.services.ce.DatasourceContextServiceCEImpl#getCachedDatasourceContextMono(DatasourceStorage, PluginExecutor, Object, DatasourceContextIdentifier)}
     * and not fetched from the cache.
     */
    @Test
    @WithUserDetails(value = "api_user")
    public void testNewDatasourceContextCreate_whenCachedDatasourceContextMono_isInErrorState() {
        doReturn(false).doReturn(false).when(datasourceContextService).getIsStale(any(), any());

        MockPluginExecutor mockPluginExecutor = new MockPluginExecutor();
        MockPluginExecutor spyMockPluginExecutor = spy(mockPluginExecutor);

        // Introduce an error to fail the datasource context mono
        doReturn(Mono.error(new RuntimeException("error_connection")))
                .doReturn(Mono.just("valid_connection"))
                .when(spyMockPluginExecutor)
                .datasourceCreate(any());

        DatasourceStorage datasourceStorage = new DatasourceStorage();
        datasourceStorage.setEnvironmentId(defaultEnvironmentId);
        datasourceStorage.setDatasourceId("error_datasource_2");
        datasourceStorage.setDatasourceConfiguration(new DatasourceConfiguration());

        DatasourceContextIdentifier datasourceContextIdentifier =
                new DatasourceContextIdentifier(datasourceStorage.getDatasourceId(), defaultEnvironmentId);

        Object monitor = new Object();

        Mono<DatasourceContext<?>> failedDatasourceContextMono =
                datasourceContextService.getCachedDatasourceContextMono(
                        datasourceStorage, spyMockPluginExecutor, monitor, datasourceContextIdentifier);
        StepVerifier.create(failedDatasourceContextMono)
                .expectError(RuntimeException.class)
                .verify();

        Mono<DatasourceContext<?>> validDatasourceContextMono = datasourceContextService.getCachedDatasourceContextMono(
                datasourceStorage, spyMockPluginExecutor, monitor, datasourceContextIdentifier);

        StepVerifier.create(validDatasourceContextMono)
                .assertNext(validDatasourceContext ->
                        assertEquals(validDatasourceContext.getConnection(), "valid_connection"))
                .verifyComplete();

        assertNotEquals(failedDatasourceContextMono, validDatasourceContextMono);
    }

    @Test
    @WithUserDetails(value = "api_user")
    public void verifyInitialiseDatasourceContextReturningRightIdentifier() {
        String sampleDatasourceId = new ObjectId().toHexString();
        DatasourceStorage datasourceStorage = new DatasourceStorage();
        datasourceStorage.setDatasourceId(sampleDatasourceId);
        datasourceStorage.setEnvironmentId(defaultEnvironmentId);

        DatasourceContextIdentifier datasourceContextIdentifier =
                datasourceContextService.initializeDatasourceContextIdentifier(datasourceStorage);

        assertThat(datasourceContextIdentifier.getDatasourceId()).isEqualTo(sampleDatasourceId);
        assertThat(datasourceContextIdentifier.getEnvironmentId()).isEqualTo(defaultEnvironmentId);
    }
}
