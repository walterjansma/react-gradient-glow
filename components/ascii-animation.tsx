"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

class AnimationManager {
	private _animation: number | null = null;
	private callback: () => void;
	private lastFrame = -1;
	private frameTime = 1000 / 30;

	constructor(callback: () => void, fps = 30) {
		this.callback = callback;
		this.frameTime = 1000 / fps;
	}

	updateFPS(fps: number) {
		this.frameTime = 1000 / fps;
	}

	start() {
		if (this._animation != null) return;
		this._animation = requestAnimationFrame(this.update);
	}

	pause() {
		if (this._animation == null) return;
		this.lastFrame = -1;
		cancelAnimationFrame(this._animation);
		this._animation = null;
	}

	private update = (time: number) => {
		const { lastFrame } = this;
		let delta = time - lastFrame;
		if (this.lastFrame === -1) {
			this.lastFrame = time;
		} else {
			while (delta >= this.frameTime) {
				this.callback();
				delta -= this.frameTime;
				this.lastFrame += this.frameTime;
			}
		}
		this._animation = requestAnimationFrame(this.update);
	};
}

interface ASCIIAnimationProps {
	frames?: string[];
	className?: string;
	fps?: number;
	colorOverlay?: boolean;
	frameCount?: number;
	frameFolder?: string;
}

export default function ASCIIAnimation({
	frames: providedFrames,
	className = "",
	fps = 24,
	colorOverlay = false,
	frameCount = 60,
	frameFolder = "frames",
}: ASCIIAnimationProps) {
	const [frames, setFrames] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [currentFrame, setCurrentFrame] = useState(0);
	const framesRef = useRef<string[]>([]);

	const [animationManager] = useState(
		() =>
			new AnimationManager(() => {
				setCurrentFrame((current) => {
					if (framesRef.current.length === 0) return current;
					return (current + 1) % framesRef.current.length;
				});
			}, fps),
	);

	useEffect(() => {
		const loadFrames = async () => {
			if (providedFrames) {
				setFrames(providedFrames);
				framesRef.current = providedFrames;
				setIsLoading(false);
				return;
			}

			try {
				const frameFiles = Array.from(
					{ length: frameCount },
					(_, i) => `frame_${String(i + 1).padStart(4, "0")}.txt`,
				);

				const framePromises = frameFiles.map(async (filename) => {
					const response = await fetch(`/${frameFolder}/${filename}`);
					if (!response.ok) {
						throw new Error(`Failed to fetch ${filename}: ${response.status}`);
					}
					return await response.text();
				});

				const loadedFrames = await Promise.all(framePromises);
				console.log(`Loaded ${loadedFrames.length} frames`);
				setFrames(loadedFrames);
				framesRef.current = loadedFrames;
				setCurrentFrame(0);
			} catch (error) {
				console.error("Failed to load ASCII frames:", error);
			} finally {
				setIsLoading(false);
			}
		};

		loadFrames();
	}, [providedFrames]);

	useEffect(() => {
		animationManager.updateFPS(fps);
	}, [fps, animationManager]);

	useEffect(() => {
		if (frames.length === 0) return;

		const reducedMotion =
			window.matchMedia(`(prefers-reduced-motion: reduce)`).matches === true;

		if (reducedMotion) {
			return;
		}

		const handleFocus = () => animationManager.start();
		const handleBlur = () => animationManager.pause();

		window.addEventListener("focus", handleFocus);
		window.addEventListener("blur", handleBlur);

		if (document.visibilityState === "visible") {
			animationManager.start();
		}

		return () => {
			window.removeEventListener("focus", handleFocus);
			window.removeEventListener("blur", handleBlur);
			animationManager.pause();
		};
	}, [animationManager, frames.length]);

	if (isLoading) {
		return (
			<div className={`font-mono whitespace-pre overflow-hidden ${className}`}>
				Loading ASCII animation...
			</div>
		);
	}

	if (!frames.length) {
		return (
			<div className={`font-mono whitespace-pre overflow-hidden ${className}`}>
				No frames loaded
			</div>
		);
	}

	return (
		<div
			className={`relative font-mono whitespace-pre overflow-hidden text-xs leading-none ${className}`}
		>
			<div>
				Frame: {currentFrame + 1}/{frames.length}
			</div>
			<div className="relative">
				{frames[currentFrame]}

				{/* Color overlay */}
				{/* {colorOverlay && ( */}
				{/* 	<div */}
				{/* 		className="absolute inset-0 pointer-events-none rounded-xl" */}
				{/* 		style={{ */}
				{/* 			background: */}
				{/* 				"radial-gradient(circle at center, rgba(143,145,3,1) 0%,  rgba(64,64,64,1) 85%)", */}
				{/* 			mixBlendMode: "color-dodge", */}
				{/* 		}} */}
				{/* 	/> */}
				{/* )} */}

				{/* Fire Color overlay */}
				{colorOverlay && (
					<div
						className="absolute inset-0 pointer-events-none rounded-xl"
						style={{
							background:
								"linear-gradient(90deg, rgba(247,70,5,0.6) 0%, rgba(255,140,0,1) 100%)",
							mixBlendMode: "color",
						}}
					/>
				)}
			</div>
		</div>
	);
}
