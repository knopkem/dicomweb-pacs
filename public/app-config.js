window.config = {
  name: 'config/default.js',
  routerBasename: null,
  extensions: [],
  modes: [],
  customizationService: {},
  showStudyList: !0,
  maxNumberOfWebWorkers: 3,
  showWarningMessageForCrossOrigin: !0,
  showCPUFallbackMessage: !0,
  showLoadingIndicator: !0,
  experimentalStudyBrowserSort: !1,
  strictZSpacingForVolumeViewport: !0,
  groupEnabledModesFirst: !0,
  allowMultiSelectExport: !1,
  maxNumRequests: { interaction: 100, thumbnail: 75, prefetch: 25 },
  multimonitor: [
    {
      id: 'split',
      test: ({ multimonitor: o }) => 'split' === o,
      screens: [
        {
          id: 'ohif0',
          screen: null,
          location: { screen: 0, width: 0.5, height: 1, left: 0, top: 0 },
          options: 'location=no,menubar=no,scrollbars=no,status=no,titlebar=no',
        },
        {
          id: 'ohif1',
          screen: null,
          location: { width: 0.5, height: 1, left: 0.5, top: 0 },
          options: 'location=no,menubar=no,scrollbars=no,status=no,titlebar=no',
        },
      ],
    },
    {
      id: '2',
      test: ({ multimonitor: o }) => '2' === o,
      screens: [
        {
          id: 'ohif0',
          screen: 0,
          location: { width: 1, height: 1, left: 0, top: 0 },
          options: 'fullscreen=yes,location=no,menubar=no,scrollbars=no,status=no,titlebar=no',
        },
        {
          id: 'ohif1',
          screen: 1,
          location: { width: 1, height: 1, left: 0, top: 0 },
          options: 'fullscreen=yes,location=no,menubar=no,scrollbars=no,status=no,titlebar=no',
        },
      ],
    },
  ],
  defaultDataSourceName: 'dicomweb',
  dataSources: [
    {
      namespace: "@ohif/extension-default.dataSourcesModule.dicomweb",
      sourceName: "dicomweb",
      configuration: {
          friendlyName: "dicomweb-pacs",
          name: "dicomweb-pacs",
          wadoUriRoot: "wadouri",
          qidoRoot: "rs",
          wadoRoot: "rs",
          qidoSupportsIncludeField: !1,
          imageRendering: "wadors",
          thumbnailRendering: "wadors",
          enableStudyLazyLoad: !0,
          supportsFuzzyMatching: !1,
          supportsWildcard: !0,
          staticWado: !0,
          singlepart: "bulkdata,video",
          bulkDataURI: {
              enabled: !0,
              relativeResolution: "studies"
          },
          omitQuotationForMultipartRequest: !0
      },
    },
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomwebproxy',
      sourceName: 'dicomwebproxy',
      configuration: { friendlyName: 'dicomweb delegating proxy', name: 'dicomwebproxy' },
    },
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomjson',
      sourceName: 'dicomjson',
      configuration: { friendlyName: 'dicom json', name: 'json' },
    },
    { namespace: '@ohif/extension-default.dataSourcesModule.dicomlocal', sourceName: 'dicomlocal', configuration: { friendlyName: 'dicom local' } },
  ],
  httpErrorHandler: (o) => {
    console.warn(o.status), console.warn('test, navigate to https://ohif.org/');
  },
};
