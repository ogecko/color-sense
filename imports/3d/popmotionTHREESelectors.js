export const setSelectors = {
  x: (element, value) => element.position.setX(value),
  y: (element, value) => element.position.setY(value),
  z: (element, value) => element.position.setZ(value),
  xy: (element, value) => (element.position.setX(value.x), element.position.setY(value.y)),
  rotateX: (element, value) => element.rotation.x = value,
  rotateY: (element, value) => element.rotation.y = value,
  rotateZ: (element, value) => element.rotation.z = value,
  scaleX: (element, value) => element.scale.setX(value),
  scaleY: (element, value) => element.scale.setY(value),
  scaleZ: (element, value) => element.scale.setZ(value),
  zoom: (element, value) => (element.zoom = value, element.updateProjectionMatrix()),
  lookAt: (element, value) => element.lookAt(value),
  aspect: (element, value) => (element.aspect = value, element.updateProjectionMatrix()),
  u_tween: (element, value) => element.material.uniforms.u_tween.value = value,
  u_time: (element, value) => element.material.uniforms.u_time.value = value,
  u_numEdges: (element, value) => element.material.uniforms.u_numEdges.value = value,
  u_maskDark: (element, value) => element.material.uniforms.u_maskDark.value = value,
  u_maskLight: (element, value) => element.material.uniforms.u_maskLight.value = value,
  u_showColors: (element, value) => element.material.uniforms.u_showColors.value = value,
  u_showEdges: (element, value) => element.material.uniforms.u_showEdges.value = value,
  u_maxContrast: (element, value) => element.material.uniforms.u_maxContrast.value = value,
  u_resolution: (element, value) => element.material.uniforms.u_resolution.value = value,
  u_mouse: (element, value) => element.material.uniforms.u_mouse.value = value,
  u_flag01: (element, value) => element.material.uniforms.u_flag01.value = value,
  u_tex01img: (element, value) => { 
  	element.material.uniforms.u_tex01.value.image = value;
  	element.material.uniforms.u_tex01.value.needsUpdate = true;
  },
  render: (element, value) => element.render = value,
};

setSelectors.scale = (element, value) => {
  setSelectors.scaleX(element, value);
  setSelectors.scaleY(element, value);
  setSelectors.scaleZ(element, value);
};

export const getSelectors = {
  x: element => element.position.x,
  y: element => element.position.y,
  z: element => element.position.z,
  xy: element => ({ x: element.position.x, y: element.position.y }),
  rotateX: element => element.rotation.x,
  rotateY: element => element.rotation.y,
  rotateZ: element => element.rotation.z,
  scaleX: element => element.scale.x,
  scaleY: element => element.scale.y,
  scaleZ: element => element.scale.z,
  zoom: element => element.zoom,
  lookAt: element => element.getWorldDirection(),
  aspect: element => element.aspect,
  u_numEdges: element => element.material.uniforms.u_numEdges.value,
  u_maskDark: element => element.material.uniforms.u_maskDark.value,
  u_maskLight: element => element.material.uniforms.u_maskLight.value,
  u_showColors: element => element.material.uniforms.u_showColors.value,
  u_showEdges: element => element.material.uniforms.u_showEdges.value,
  u_maxContrast: element => element.material.uniforms.u_maxContrast.value,
  render: element => element.render,
};

getSelectors.scale = getSelectors.scaleX;
