import * as d3c from 'd3-color';

export function getWebglPixel(gl, event) {
	const pixelBuffer = new Uint8Array(4);
	gl.readPixels(
		event.srcEvent.offsetX,
		gl.drawingBufferHeight - event.srcEvent.offsetY,
		1, 1,
		gl.RGBA, gl.UNSIGNED_BYTE,
		pixelBuffer
	);
	return d3c.rgb(pixelBuffer[0], pixelBuffer[1], pixelBuffer[2]);
}
