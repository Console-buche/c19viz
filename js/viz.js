function addSick(dataSet, arr) {
    let map = arr;
    let sums = {
        Confirmed: 0,
        Recovered: 0,
        Deaths: 0
    };
    var points = [];
    dataSet.dataFrance.forEach((v, k) => {

        var location = v.fields.subzone;
        var loc = v.fields.location;

        sums[v.fields.category] += v.fields.count;

        // console.log(v);
        if (!v.fields.subzone) {
            var person = {
                state: v.fields.category,
                count: v.fields.count,
                date: v.fields.date,
                zone: v.fields.sub
            };

            points.push(person);
        }

    });

    points.sort(function (a, b) {
        // Turn your strings into dates, and then subtract them
        // to get a value that is either negative, positive, or zero.
        return new Date(a.date) - new Date(b.date);
    });

    return [sums, points]
}

export default addSick