(window.webpackJsonp=window.webpackJsonp||[]).push([[3],{771:function(e,t,n){"use strict";n.r(t);var r=n(0),a=n.n(r),i=n(1),s=n.n(i),o=n(9),c=n.n(o),u=n(7),l=n.n(u),d=n(767),I=n.n(d),f=n(75),p=n(16),y=n(473),m=n(8),S=n(74),D=n(26);function h(e,t,n){var r=function(e){var n=t.VALUE_TYPES,r=n.POLYLINE,a=n.ELLIPSE,i=n.POINT;return{Length:r,EllipticalRoi:a,Bidirectional:n.BIDIRECTIONAL,ArrowAnnotate:i}[e]};switch(e){case"Length":return function(e){return function(e,t,n){var r=e.toolType||e.toolName,a=cornerstone.metaData.get("instance",t),i=a.SOPInstanceUID,s=a.FrameOfReferenceUID,o=a.SeriesInstanceUID,c=a.StudyInstanceUID,u=e.handles,l=[];return Object.keys(u).map((function(e){if(["start","end"].includes(e)){var t={};u[e].x&&(t.x=u[e].x),u[e].y&&(t.y=u[e].y),l.push(t)}})),{id:e.id,SOPInstanceUID:i,FrameOfReferenceUID:s,referenceSeriesUID:o,referenceStudyUID:c,label:e.text,description:e.description,unit:e.unit,length:e.length,type:n(r),points:l}}(e,n,r)};case"Bidirectional":return function(e){return function(e,t,n){var r=e.toolType||e.toolName,a=cornerstone.metaData.get("instance",t),i=a.SOPInstanceUID,s=a.FrameOfReferenceUID,o=a.SeriesInstanceUID,c=a.StudyInstanceUID,u=e.handles,l=[u.start,u.end],d=[u.perpendicularStart,u.perpendicularEnd];return{id:e.id,SOPInstanceUID:i,FrameOfReferenceUID:s,referenceSeriesUID:o,referenceStudyUID:c,label:e.text,description:e.description,unit:e.unit,shortestDiameter:e.shortestDiameter,longestDiameter:e.longestDiameter,type:n(r),points:{longAxis:l,shortAxis:d}}}(e,n,r)};case"EllipticalRoi":return function(e){return function(e,t,n){var r=e.toolType||e.toolName,a=cornerstone.metaData.get("instance",t),i=a.SOPInstanceUID,s=a.FrameOfReferenceUID,o=a.SeriesInstanceUID,c=a.StudyInstanceUID,u=e.handles,l=u.start,d=u.end,I=Math.abs(l.x-d.x)/2,f=Math.abs(l.y-d.y)/2,p=[],y={x:(l.x+d.x)/2,y:(l.y+d.y)/2};I>f?(p.push({x:y.x-I,y:y.y}),p.push({x:y.x+I,y:y.y}),p.push({x:y.x,y:y.y-f}),p.push({x:y.x,y:y.y+f})):(p.push({x:y.x,y:y.y-f}),p.push({x:y.x,y:y.y+f}),p.push({x:y.x-I,y:y.y}),p.push({x:y.x+I,y:y.y}));return{id:e.id,SOPInstanceUID:i,FrameOfReferenceUID:s,referenceSeriesUID:o,referenceStudyUID:c,label:e.text,description:e.description,unit:e.unit,area:e.cachedStats&&e.cachedStats.area,type:n(r),points:p}}(e,n,r)};case"ArrowAnnotate":return function(e){return function(e,t,n){var r=e.toolType||e.toolName,a=cornerstone.metaData.get("instance",t),i=a.SOPInstanceUID,s=a.FrameOfReferenceUID,o=a.SeriesInstanceUID,c=a.StudyInstanceUID,u=e.handles,l=[];return Object.keys(u).map((function(e){if(["start","end"].includes(e)){var t={};u[e].x&&(t.x=u[e].x),u[e].y&&(t.y=u[e].y),l.push(t)}})),{id:e.id,SOPInstanceUID:i,FrameOfReferenceUID:s,referenceSeriesUID:o,referenceStudyUID:c,label:e.text,description:e.description,unit:e.unit,text:e.text,type:n(r),points:l}}(e,n,r)}}}var v=n(48);function g(e,t,n,r,a,i,s){try{var o=e[i](s),c=o.value}catch(e){return void n(e)}o.done?t(c):Promise.resolve(c).then(r,a)}function U(e){return function(){var t=this,n=arguments;return new Promise((function(r,a){var i=e.apply(t,n);function s(e){g(i,r,a,s,o,"next",e)}function o(e){g(i,r,a,s,o,"throw",e)}s(void 0)}))}}function b(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function O(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?b(Object(n),!0).forEach((function(t){x(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):b(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function x(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function E(e,t){return function(e){if(Array.isArray(e))return e}(e)||function(e,t){if("undefined"==typeof Symbol||!(Symbol.iterator in Object(e)))return;var n=[],r=!0,a=!1,i=void 0;try{for(var s,o=e[Symbol.iterator]();!(r=(s=o.next()).done)&&(n.push(s.value),!t||n.length!==t);r=!0);}catch(e){a=!0,i=e}finally{try{r||null==o.return||o.return()}finally{if(a)throw i}}return n}(e,t)||function(e,t){if(!e)return;if("string"==typeof e)return P(e,t);var n=Object.prototype.toString.call(e).slice(8,-1);"Object"===n&&e.constructor&&(n=e.constructor.name);if("Map"===n||"Set"===n)return Array.from(e);if("Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))return P(e,t)}(e,t)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function P(e,t){(null==t||t>e.length)&&(t=e.length);for(var n=0,r=new Array(t);n<t;n++)r[n]=e[n];return r}var w=f.a.formatDate,T=c.a.importInternal("util/scrollToIndex"),j=c.a.globalImageIdSpecificToolStateManager,k=p.a.utils,A=k.StackManager,M=k.guid;function R(e){var t,n=e.children,i=e.dataSource,s=e.displaySet,o=e.viewportIndex,u=e.servicesManager,d=e.extensionManager,f=u.services,g=f.DisplaySetService,U=f.MeasurementService,b=E(Object(m.hb)(),2),x=b[0],P=b[1],k=E(Object(r.useState)(0),2),A=k[0],R=k[1],N=E(Object(r.useState)(1),2),L=N[0],B=N[1],H=E(Object(r.useState)(null),2),q=H[0],_=H[1],V=E(Object(r.useState)({}),2),Y=V[0],J=V[1],W=E(Object(r.useState)(null),2),Z=W[0],z=W[1],G=E(Object(r.useState)(s.isHydrated),2),K=G[0],$=G[1],Q=x.viewports,X=x.activeViewportIndex;if(d.registeredExtensionIds.includes("org.ohif.measurement-tracking")){var ee=d.getModuleEntry("org.ohif.measurement-tracking.contextModule.TrackedMeasurementsContext"),te=E(Object(r.useContext)(ee.context),2);te[0],t=te[1]}Object(r.useEffect)((function(){s.isLoaded||s.load(),$(s.isHydrated)}),[s]);var ne=Object(r.useCallback)((function(e){var t=s.measurements;c.a.getModule(v.c).setters.trackingUniqueIdentifiersForElement(e,t.map((function(e){return e.TrackingUniqueIdentifier})),A)}));Object(r.useEffect)((function(){var e=s.measurements.length;B(e)}),[i,s,s.StudyInstanceUID,s.displaySetInstanceUID]);var re=function(e){var t=s.StudyInstanceUID,n=s.displaySetInstanceUID,r=s.sopClassUids;t&&n&&(r&&r.length>1&&console.warn("More than one SOPClassUID in the same series is not yet supported."),function(e,t,n,r,a){return C.apply(this,arguments)}(i,s,e,g,Z).then((function(t){var n=t.viewportData,r=t.activeDisplaySetData;_(O({},n)),J(O({},r)),R(e),null!==Z&&(T(Z,n.stack.currentImageIdIndex),l.a.updateImage(Z))})))};Object(r.useEffect)((function(){null!==Z&&ne(Z)}),[i,s,s.StudyInstanceUID,s.displaySetInstanceUID]),Object(r.useEffect)((function(){re(A)}),[i,s,s.StudyInstanceUID,s.displaySetInstanceUID,Z]);var ae=Q.findIndex((function(e){return e.displaySetInstanceUID===s.displaySetInstanceUID})),ie=null;if(!q)return null;var se=q.stack,oe=se.imageIds,ce=se.currentImageIdIndex;n&&n.length&&(ie=n.map((function(e,t){return e&&a.a.cloneElement(e,{viewportIndex:o,key:t})})));var ue=s.Modality,le=Y.PatientID,de=Y.PatientName,Ie=Y.PatientSex,fe=Y.PatientAge,pe=Y.SliceThickness,ye=Y.ManufacturerModelName,me=Y.StudyDate,Se=Y.SeriesDescription,De=(Y.SeriesInstanceUID,Y.PixelSpacing),he=Y.SeriesNumber;Y.displaySetInstanceUID;var ve=Q.length>1?F[ae]:"";return a.a.createElement(a.a.Fragment,null,a.a.createElement(m.Y,{onDoubleClick:function(e){e.stopPropagation(),e.preventDefault()},onSeriesChange:function(e){var t=A;"right"===e?++t>=L&&(t=0):--t<0&&(t=L-1),re(t)},onHydrationClick:function(){var e=U.getSourceMappings("CornerstoneTools","4");if(!e||!e.length)throw new Error("Attempting to hydrate measurements service when no mappings present. This shouldn't be reached.");var n=y.a.getInstance(s.StudyInstanceUID,s.SeriesInstanceUID,s.SOPInstanceUID),r=D.a.Cornerstone.MeasurementReport,a={};s.measurements.forEach((function(e){var t=e.ReferencedSOPInstanceUID,n=e.imageId;a[t]||(a[t]=n)}));var i=r.generateToolState(n),o=e.map((function(e){return e.definition})),c={};if(Object.keys(i).forEach((function(e){o.includes(e)&&(c[e]=i[e])})),d.registeredExtensionIds.includes("org.ohif.measurement-tracking")){var u,I=[];Object.keys(c).forEach((function(e){c[e].forEach((function(e){var t=a[e.sopInstanceUid];I.includes(t)||I.push(t)}))}));for(var f=[],p=0;p<I.length;p++){var m=I[0],S=l.a.metaData.get("instance",m),v=S.SeriesInstanceUID,g=S.StudyInstanceUID;f.includes(v)||f.push(v),u?u!==g&&console.warn("NO SUPPORT FOR SRs THAT HAVE MEASUREMENTS FROM MULTIPLE STUDIES."):u=g}t("SET_TRACKED_SERIES",{StudyInstanceUID:u,SeriesInstanceUIDs:f})}Object.keys(c).forEach((function(e){c[e].forEach((function(t){var n=a[t.sopInstanceUid];t.id=M(),function(e,t,n){var r=j.saveToolState();void 0===r[n]&&(r[n]={});var a=r[n];void 0===a[t]&&(a[t]={data:[]});a[t].data.push(e)}(t,e,n);var r=h(e,U,n),i=U.getSource("CornerstoneTools","4");U.addRawMeasurement(i,e,t,r),oe.includes(n)||oe.push(n)}))})),s.isHydrated=!0,$(!0),P.setDisplaysetForViewport({viewportIndex:X,displaySetInstanceUID:Y.displaySetInstanceUID})},showNavArrows:o===X,studyData:{label:ve,isTracked:!1,isLocked:s.isLocked,isHydrated:K,studyDate:w(me),currentSeries:he,seriesDescription:Se,modality:ue,patientInformation:{patientName:de?p.a.utils.formatPN(de.Alphabetic):"",patientSex:Ie||"",patientAge:fe||"",MRN:le||"",thickness:pe?"".concat(pe.toFixed(2),"mm"):"",spacing:De&&De.length?"".concat(De[0].toFixed(2),"mm x ").concat(De[1].toFixed(2),"mm"):"",scanner:ye||""}}}),a.a.createElement("div",{className:"relative flex flex-row w-full h-full overflow-hidden"},a.a.createElement(I.a,{onElementEnabled:function(e){var t=e.detail.element,n=c.a.store.state.globalTools;Object.keys(n).forEach((function(e){c.a.setToolDisabledForElement(t,e)})),c.a.setToolEnabledForElement(t,S.a.DICOM_SR_DISPLAY_TOOL),c.a.setToolActiveForElement(t,"PanMultiTouch",{pointers:2}),c.a.setToolActiveForElement(t,"ZoomTouchPinch",{}),c.a.setToolActiveForElement(t,"Wwwc",{mouseButtonMask:1}),c.a.setToolActiveForElement(t,"Pan",{mouseButtonMask:4}),c.a.setToolActiveForElement(t,"Zoom",{mouseButtonMask:2}),c.a.setToolActiveForElement(t,"StackScrollMouseWheel",{}),ne(t),z(t)},viewportIndex:o,imageIds:oe,imageIdIndex:ce,isActive:!0,isStackPrefetchEnabled:!0,isPlaying:!1,frameRate:24,isOverlayVisible:!1,resizeRefreshRateMs:150}),ie))}var F=["A","B","C","D","E","F","G","H","I"];function N(e,t,n,r){var a=e.displaySetInstanceUID,i=e.TrackingUniqueIdentifier,s=n.getDisplaySetByUID(a),o=A.findOrCreateStack(s,t),u=Object.assign({},o),l=e.imageId;(u.currentImageIdIndex=u.imageIds.findIndex((function(e){return e===l})),r)&&c.a.getModule(v.c).setters.activeTrackingUniqueIdentifierForElement(r,i);return u}function C(){return(C=U(regeneratorRuntime.mark((function e(t,n,r,a,i){var s,o,c,u,l,d,I,f;return regeneratorRuntime.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return o=n.measurements,c=o[r],u=N(c,t,a,i),s={StudyInstanceUID:n.StudyInstanceUID,displaySetInstanceUID:n.displaySetInstanceUID,stack:u},l=c.displaySetInstanceUID,d=a.getDisplaySetByUID(l),I=d.images[0],f={PatientID:I.PatientID,PatientName:I.PatientName,PatientSex:I.PatientSex,PatientAge:I.PatientAge,SliceThickness:I.SliceThickness,StudyDate:I.StudyDate,SeriesDescription:I.SeriesDescription,SeriesInstanceUID:I.SeriesInstanceUID,SeriesNumber:I.SeriesNumber,displaySetInstanceUID:l},e.abrupt("return",{viewportData:s,activeDisplaySetData:f});case 9:case"end":return e.stop()}}),e)})))).apply(this,arguments)}R.propTypes={displaySet:s.a.object.isRequired,viewportIndex:s.a.number.isRequired,dataSource:s.a.object,children:s.a.node,customProps:s.a.object},R.defaultProps={customProps:{}};t.default=R}}]);
//# sourceMappingURL=3.bundle.497c8c84878a88907a7e.js.map