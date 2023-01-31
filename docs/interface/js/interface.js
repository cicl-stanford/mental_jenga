$(document).ready(function() {

    // quick function to get elementement
    var element = function(id){return document.getElementById(id)};
    var val = function(id){return element(id).value}

    var sn = element('game-frame').contentWindow;

    var exp = 1
    $('#exp1').css('background-color', '#bdf')
    game = document.getElementById('game-frame')

    $('#exp1').click(function() {
        $('.experiment div').css('background-color', '#eee')
        $('#exp1').css('background-color', '#bdf')
        exp = 1
        loadClip()
    })
    $('#exp2').click(function() {
        $('.experiment div').css('background-color', '#eee')
        $('#exp2').css('background-color', '#bdf')
        exp = 2
        loadClip()
    })
    
    $('#exp3').click(function() {
        $('.experiment div').css('background-color', '#eee')
        $('#exp3').css('background-color', '#bdf')
        exp = 3
        loadClip()
    })

    $('#trial-num').change(function() {
        loadClip()
    })

    function loadClip() {
        clipNum = exp + ',' + val('trial-num')
        sn.loadClip('load',
            clipNum,
            0
        );
    }

    $('#load').click(function() {
        loadClip()
    })
    
    $('#load-remove').click(function() {
        clipNum = exp + ',' + val('trial-num')
        noiseLevel = val('perceptual-level') + ',' + val('intervention-level') + ',' + val('dynamics-level')
        sn.loadClip('remove',
            clipNum,
            0,
            noise=[
                'perceptual,impulse-aligned,dynamics',
                noiseLevel
            ]
        );
    })

    // $('#perceptual-level').on("change", function() {
    //     $('#perceptual-num').text($('#perceptual-level').val());
    // });
    percLevel = element('perceptual-level');
    percLevel.oninput = function() {
        element('perceptual-num').innerHTML = percLevel.value
    }
    intLevel = element('intervention-level');
    intLevel.oninput = function() {
        element('intervention-num').innerHTML = intLevel.value
    }
    dynLevel = element('dynamics-level');
    dynLevel.oninput = function() {
        element('dynamics-num').innerHTML = dynLevel.value
    }
})

function minmax(value, min, max) 
{
    value = parseInt(value)
    if(value < min || isNaN(value)) 
        return 1; 
    else if(value > max) 
        return 42; 
    else return value;
}
