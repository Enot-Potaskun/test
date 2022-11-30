// 28.09.20. - 02.10.20.
const { src, dest, watch, series, parallel } = require('gulp');

const sass = require('gulp-sass')(require('sass'));
sass.compiler = require('node-sass');

const sourcemaps = require('gulp-sourcemaps');
const autoprefixer = require('gulp-autoprefixer');

const browserSync = require('browser-sync').create();

const concatJS = require('gulp-concat');
const minifyJS = require('gulp-uglifyjs');

const concatCSS = require('gulp-concat-css');
const minifyCSS = require('gulp-cssnano');

const rigger = require('gulp-rigger');

const rename = require('gulp-rename');
const clean = require('gulp-clean');

const sassGLOB = './app/sass/**/*.+(sass|scss)';
const riggerGLOB = './app/tpl/**/*.html';

function SASS(cb) {    // cb -callback
    // прописка пути работает по стандарту glob. *.sass - выбираются все файлы с расширением sass
    // ** все файлы sass во всех папках, т.к. в больших проектах будет много директорий где sass-файлы
    // *.+(sass|scss) можем захотеть несколько типов файлов поискать (вдруг по ходу перейдем на scss)
    src(sassGLOB)  //  sass('./app/sass/**/*.sass')
        // метод pipe, принимающий в Галпе какое-то действие, т.е. нам с этими файлами надо что-то сделать
        .pipe(sourcemaps.init())  // sourcemaps(init) запуск (инициализация) карты источника - метод пройдется по файлу
        // и составит эту карту
        // следующий pipe. из пипов будет цепочка, последовательность действий
        .pipe(sass({ outputStyle: 'compact' }).on('error', sass.logError))    // то, как будет выглядить css-файл 
        // после компилляции - вложенный, развернутый, компактный, сжатый. on('error') - обработчик на события, нужен, 
        // чтобы сообщал в терминал, если мы допустили какую-то ошибку
        .pipe(autoprefixer(['last 15 version', '> 1%']))  // для некоторых браузеров нужны префиксы в свойствах, они прописываются этим методом
        // 'last 15 version' - чтобы поддерживала 15 последних версий браузеров
        .pipe(sourcemaps.write())  // Карту можно уже составить
        .pipe(dest('./app/css'))  // теперь новый css-файл надо куда-то примостить. dest - destination - назначение
        .pipe(browserSync.stream()); // надо, когда мы меняем sass-код страница не перезагружалась, а изменения в css
    // просто добавлялись браузером. Это чтобы не подгружались новые скрипты и т.д.

    if (typeof cb == 'function') cb();
}

function liveReload(cb) {
    browserSync.init({
        server: {                // настройки сервера
            baseDir: './app'    // стартовая директория, там, где index.html
        },
        notify: false  // убирает плашку BrowserSync:connected

    });

    watch(['./app/**/*.html', './app/js/**/*.js']).on('all', browserSync.reload);  // за какими файлами нужно следить. 
    // Если меняется html и js то перезагрузится страница. Вышла выборка. all - подписались на все события
    watch([sassGLOB]).on('all', () => SASS());  // следит за измененниями sass-файлов и при любом действии запускает 
    // ф-ю SASS, которая компеллирует css. Ф-я SASS запускается при изменениях в файле
    watch([riggerGLOB]).on('all', () => riggerIt());  // будет следить за изменением файлов в опр месте, конкретно в выборке riggerGLOB

    if (typeof cb == 'function') cb();  // такая проверка на функцию желательна, можно и  cb();  оставить, но
    // мы не знаем куда в будущем будем эти функции внедрять и лучше позаботится о такой безопасности
}

function bundleCSS(cb) {  // bundle - объеденение
    src([
        './node_modules/slick-carousel/slick/slick.css',  // путь к нужным нам библиотекам
        './node_modules/@fancyapps/fancybox/dist/jquery.fancybox.css'  // путь к нужным нам библиотекам
    ]).pipe(concatCSS('libs.min.css'))  // libs.min.css файл, в котором будет сборка библеотек, min - минифицированный
        .pipe(minifyCSS())              // ф-я минификации
        .pipe(dest('./app/css')); // куда готовый файл отправить  

    cb();
}

function bundleJS(cb) {  // bundle - объеденение
    src([
        './node_modules/jquery/dist/jquery.js',  // этот файл должен быть первым
        './node_modules/@fancyapps/fancybox/dist/jquery.fancybox.js',
        './node_modules/slick-carousel/slick/slick.js'
    ]).pipe(concatJS('libs.min.js'))  // libs.min.css файл, в котором будет сборка, min - минифицированный
        .pipe(minifyJS())
        .pipe(dest('./app/js')); // куда готовый файл отправить  
    cb();

}

function riggerIt(cb) {
    src('./app/tpl/*.html')  // берем index.html
        .pipe(rigger())  // риггерим его, добавив конструкции //= ./components/_header.html и //= ./components/_footer.html
        // и, из папки components добавится содержимое  _header.html и _footer.html БЕЗ ПРОБЕЛОВ СЗАДИ - ВАЛИТСЯ СЕРВЕР!
        .pipe(dest('./app'));    // обновленный index.html с добавленным содержимым из _header.html и _footer.html
    console.log('1234567890')

    if (typeof cb == 'function') cb();
}

function processImg(cb) {
    src('./app/img/*-min.*')   // искать любые файлы с любым расширением с префиксом min
        .pipe(rename(function (opt, file) {  // opt, file - настройки и файлы. rename создает копию файла
            opt.basename = opt.basename.slice(0, -4);
            src(file.history[0], { read: false }).pipe(clean()); // надо избавится от файла-оригинала
            return opt; // т.к. это ф-я callback в ринейме, то надо вернуть для этого файла поменянные нами опции
        })).pipe(dest('./app/img'));  // у сжатых файлов удалилось -min 
    if (typeof cb == 'function') cb();
}


// Ф-ции выполн одна за одной - синхронно или одна за одной
// exports.sass = SASS;          
// exports.watch = liveReload;
// exports.bundleCSS = bundleCSS;
// exports.bundleJS = bundleJS;     // было


exports.sass = SASS;

exports.watch = series(SASS, liveReload);    // Ф-ции выполн асинхронно - параллельно, из 2-х сделали одну
exports.bundleAll = parallel(bundleCSS, bundleJS);  // Соединили несколько ф-й в одну

exports.bundleCSS = bundleCSS;
exports.bundleJS = bundleJS;    // стало 

exports.processImg = processImg;