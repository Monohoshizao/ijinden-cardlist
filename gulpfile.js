const gulp = require("gulp");
const plumber = require("gulp-plumber");
const { deleteAsync } = require("del");
const browserSync = require("browser-sync").create();
const sourcemaps = require("gulp-sourcemaps");
const fs = require("fs");
const path = require("path");
const nunjucksRender = require("gulp-nunjucks-render");
const data = require("gulp-data");
const sass = require("gulp-sass")(require("sass"));
const postcss = require("gulp-postcss");
const autoprefixer = require("autoprefixer");
const terser = require("gulp-terser");
const newer = require("gulp-newer");
const through2 = require("through2");
const ffmpegPath = require("ffmpeg-static");
const { spawn } = require("child_process");

// パス定義
const paths = {
	njkAll: "src/nunjucks/**/*.njk",
	pages: "src/nunjucks/pages/**/*.njk",
	staticHtml: "src/html/**/*.html",
	stylesAll: "src/scss/**/*.scss",
	scripts: "src/js/**/*.js",
	images: "src/images/**/*.{jpg,jpeg,png,svg,gif,webp}",
	videos: "src/videos/**/*.{mp4,mov,webm,avi}",
	data: "src/data/**/*",
	dist: "dist",
	distSCSS: "dist/assets/scss",
	distCSS: "dist/assets/css",
	distJS: "dist/assets/js",
	distIMG: "dist/assets/images",
	distVIDEO: "dist/assets/videos",
	distData: "dist/assets/data",
};

// 共通ユーティリティ
function onErr(taskName) {
	return function (err) {
		console.error(`[${taskName}]`, err.message || err);
		this.emit("end");
	};
}

// dist全削除（ビルド時のみ）
function clean() {
	return deleteAsync([paths.dist]);
}

// Nunjucks → HTML
function nunjucks() {
	return gulp
		.src([paths.pages, "!**/templage.njk"])
		.pipe(plumber({ errorHandler: onErr("nunjucks") }))
		.pipe(
			data(() => {
				const dataDir = path.join(__dirname, "src/data");
				let mergedData = {};

				if (fs.existsSync(dataDir)) {
					fs.readdirSync(dataDir).forEach((file) => {
						if (path.extname(file) === ".json") {
							const jsonPath = path.join(dataDir, file);
							const key = path.basename(file, ".json");
							try {
								mergedData[key] = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
							} catch (e) {
								console.error(`[nunjucks] JSON parse error in ${file}:`, e.message);
							}
						}
					});
				}

				return mergedData;
			}),
		)
		.pipe(
			nunjucksRender({
				path: ["src/nunjucks/layouts", "src/nunjucks/components", "src/nunjucks/pages"],
				envOptions: { noCache: true, trimBlocks: true, lstripBlocks: true },
			}),
		)
		.pipe(gulp.dest(paths.dist))
		.pipe(browserSync.stream());
}

// HTMLコピー
function html() {
	return gulp
		.src(paths.staticHtml, { base: "src/html" })
		.pipe(plumber({ errorHandler: onErr("html") }))
		.pipe(gulp.dest(paths.dist))
		.pipe(browserSync.stream());
}

// SCSS → CSS
function styles() {
	return gulp
		.src(["src/scss/**/*.scss", "!src/scss/**/_*.scss"])
		.pipe(plumber({ errorHandler: onErr("styles") }))
		.pipe(sourcemaps.init())
		.pipe(sass().on("error", sass.logError))
		.pipe(postcss([autoprefixer()]))
		.pipe(sourcemaps.write("."))
		.pipe(gulp.dest(paths.distCSS))
		.pipe(browserSync.stream());
}

// SCSSコピー
function copySass() {
	return deleteAsync([paths.distSCSS]).then(() => {
		return gulp.src("src/scss/**/*.scss", { base: "src/scss" }).pipe(gulp.dest(paths.distSCSS));
	});
}

// JS
function scripts() {
	return gulp
		.src(paths.scripts)
		.pipe(plumber({ errorHandler: onErr("scripts") }))
		.pipe(sourcemaps.init())
		.pipe(terser())
		.pipe(sourcemaps.write("."))
		.pipe(gulp.dest(paths.distJS))
		.pipe(browserSync.stream());
}

// 画像最適化
async function images() {
	const mod = await import("gulp-imagemin");
	const imagemin = mod.default;
	const { mozjpeg, optipng, svgo } = mod;

	return gulp
		.src(paths.images, { encoding: false })
		.pipe(newer(paths.distIMG))
		.pipe(
			imagemin([
				mozjpeg({ quality: 75, progressive: true }),
				optipng({ optimizationLevel: 5 }),
				svgo({
					plugins: [
						{ name: "removeViewBox", active: false },
						{ name: "cleanupIDs", active: false },
					],
				}),
			]),
		)
		.pipe(gulp.dest(paths.distIMG));
}

// 動画最適化
function videos() {
	return gulp
		.src(paths.videos, { allowEmpty: true })
		.pipe(plumber({ errorHandler: onErr("videos") }))
		.pipe(
			through2.obj(function (file, _, cb) {
				if (!file || file.isNull()) {
					cb(null, file);
					return;
				}

				const outDir = path.resolve(paths.distVIDEO);
				const base = path.basename(file.path).replace(/\.(mp4|mov|avi|webm)$/i, ".mp4");
				const outPath = path.join(outDir, base);

				fs.mkdirSync(outDir, { recursive: true });

				const args = ["-y", "-i", file.path, "-vcodec", "libx264", "-crf", "26", "-preset", "medium", "-movflags", "+faststart", "-acodec", "aac", "-b:a", "128k", outPath];

				const proc = spawn(ffmpegPath, args, { stdio: "inherit" });

				proc.on("error", (err) => cb(err));

				proc.on("close", (code) => {
					if (code !== 0) {
						cb(new Error(`[videos] ffmpeg exited with code ${code}`));
						return;
					}
					cb(null, file);
				});
			}),
		)
		.on("end", () => browserSync.reload());
}

// /dataコピー
function copyData() {
	return gulp
		.src(paths.data, { base: "src/data", allowEmpty: true })
		.pipe(plumber({ errorHandler: onErr("copyData") }))
		.pipe(newer(paths.distData))
		.pipe(gulp.dest(paths.distData));
}

// unlink時に/distの該当ファイルだけ削除
function deleteDistFile(filePath, srcBase, distBase) {
	const rel = path.relative(path.resolve(srcBase), filePath);
	const distPath = path.resolve(distBase, rel);
	deleteAsync(distPath).then(() => console.log(`[unlink] deleted: ${distPath}`));
}

// 画像用：unlink時に/distの該当ファイルだけ削除
function deleteDistImageFile(filePath) {
	const srcBase = path.resolve("src/images");
	const rel = path.relative(srcBase, filePath);
	const distPath = path.resolve(paths.distIMG, rel);

	fs.unlink(distPath, (err) => {
		if (err) {
			if (err.code === "ENOENT") {
				console.log("[images unlink] not found (already deleted):", distPath);
			} else {
				console.error("[images unlink] fs.unlink error:", err.message);
			}
		} else {
			console.log("[images unlink] deleted by fs.unlink:", distPath);
		}
	});
}

// SCSS unlink処理
function copyOneSass(filePath) {
	return gulp.src(filePath, { base: "src/scss" }).pipe(gulp.dest(paths.distSCSS));
}

function watchSass() {
	const watcher = gulp.watch(paths.stylesAll, { ignoreInitial: true });

	const handleAddOrChange = (filePath) => {
		gulp.series(styles, function copyChangedScss() {
			return copyOneSass(filePath);
		})();
	};

	watcher.on("add", handleAddOrChange);
	watcher.on("change", handleAddOrChange);

	watcher.on("unlink", (filePath) => {
		deleteDistFile(filePath, "src/scss", paths.distSCSS);

		const cssPath = filePath.replace(/src[\/\\]scss/, paths.distCSS).replace(/\.scss$/, ".css");
		const mapPath = cssPath + ".map";

		deleteAsync(cssPath);
		deleteAsync(mapPath);

		console.log("[scss unlink] deleted:", cssPath, mapPath);
	});
}

// JS unlink処理
function watchJs() {
	const watcher = gulp.watch(paths.scripts, { ignoreInitial: true });

	watcher.on("change", scripts);
	watcher.on("add", scripts);

	watcher.on("unlink", (filePath) => {
		deleteDistFile(filePath, "src/js", paths.distJS);

		deleteAsync(filePath.replace(/src[\/\\]js/, paths.distJS).replace(/\.js$/, ".js.map"));
	});
}

// images unlink処理
function watchImages() {
	const watcher = gulp.watch(paths.images, { ignoreInitial: true });

	watcher.on("add", images);
	watcher.on("change", images);

	watcher.on("unlink", (filePath) => {
		console.log("[images unlink] src:", filePath);
		deleteDistImageFile(filePath);
	});
}

// videos unlink処理
function watchVideos() {
	const watcher = gulp.watch(paths.videos, { ignoreInitial: true });

	watcher.on("add", videos);
	watcher.on("change", videos);

	watcher.on("unlink", (filePath) => {
		const srcBase = path.resolve("src/videos");
		const rel = path.relative(srcBase, filePath);
		const dir = path.dirname(rel);
		const baseName = path.basename(rel, path.extname(rel));

		const distPath = path.resolve(paths.distVIDEO, dir, baseName + ".mp4");

		deleteAsync(distPath).then(() => {
			console.log("[videos unlink] deleted:", distPath);
		});
	});
}

// /data unlink処理
function watchData() {
	const watcher = gulp.watch(paths.data, { ignoreInitial: true });

	watcher.on("add", copyData);
	watcher.on("change", copyData);
	watcher.on("unlink", (filePath) => {
		deleteDistFile(filePath, "src/data", paths.distData);
	});
}

// 開発サーバ & 監視
function watchFiles() {
	gulp.watch(paths.njkAll, nunjucks);
	gulp.watch(paths.staticHtml, html);

	watchSass();
	watchJs();
	watchImages();
	watchVideos();
	watchData();
}

// ローカル専用サーバー
function serveLocal(done) {
	const distAbs = path.resolve(paths.dist);

	browserSync.init(
		{
			server: { baseDir: distAbs, index: "index.html" },
			notify: false,
		},
		(err) => {
			if (err) return done(err);
			watchFiles();
			done();
		},
	);
}

// 外部デバイス確認用サーバー
function serveExternal(done) {
	const distAbs = path.resolve(paths.dist);

	browserSync.init(
		{
			server: { baseDir: distAbs, index: "index.html" },
			host: "0.0.0.0",
			online: true,
			port: 3000,
			notify: false,
		},
		(err) => {
			if (err) return done(err);
			watchFiles();
			done();
		},
	);
}

// buildは全削除
const build = gulp.series(clean, gulp.parallel(html, styles, copySass, scripts, images, videos, copyData), nunjucks);

exports.clean = clean;
exports.html = html;
exports.nunjucks = nunjucks;
exports.styles = styles;
exports.copySass = copySass;
exports.scripts = scripts;
exports.images = images;
exports.videos = videos;
exports.copyData = copyData;
exports.build = build;
exports.dev = gulp.series(build, serveLocal); // 通常開発用
exports.devExternal = gulp.series(build, serveExternal); // スマホ確認したいとき
exports.default = exports.dev;
