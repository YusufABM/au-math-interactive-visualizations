import matplotlib.pyplot as plt
import matplotlib.colors as colors

import numpy as np
from ipywidgets import interact, FloatSlider
from tkinter import simpledialog
from IPython.display import display, Math, Latex


def divisor_size(dim):
    '''
    This function determines the size of the text of the divisor data

    dim: the dimension of the Kähler cone

    Returns: the size of the text of the divisor data
    '''
    if dim in range(1, 4):
        return 2
    elif dim in range(4, 10):
        return 5


def format_e_with_subscript(dim_index):
    '''
    This function determines the subscript of E

    dim_index: the dimension of the generator E

    Returns: E with the correct subscript
    '''
    subscripts = {
        '0': '\u2080',
        '1': '\u2081',
        '2': '\u2082',
        '3': '\u2083',
        '4': '\u2084',
        '5': '\u2085',
        '6': '\u2086',
        '7': '\u2087',
        '8': '\u2088',
        '9': '\u2089'
    }

    if dim_index == 0:
        return "E"
    else:
        subscript = ''.join(subscripts[d] for d in str(dim_index))
        return f"E{subscript}"


def plot_heatmap_nd(**kwargs):
    '''
    This function plots the data in a heatmap
    '''
    # Extract slider values
    slider_values = {k: v for k, v in kwargs.items() if k.startswith('alpha_')}

    # Extract indices from slider values
    indices = []
    for dim in sorted(slider_values.keys(), key=lambda x: int(x.split('_')[1])):
        alpha_val = slider_values[dim]
        dim_index = int(dim.split('_')[1])
        dim_vals = np.linspace(0, 1, sign_data.shape[dim_index])
        index = np.argmin(np.abs(dim_vals - alpha_val))
        indices.append(index)

    # Slice the matrices using the indices and ellipsis for the last two dimensions
    sign_matrix = sign_data[tuple(indices) + (Ellipsis,)]
    div_matrix = div_data[tuple(indices) + (Ellipsis,)]

    norm = colors.TwoSlopeNorm(vmin=min_plot_value, vcenter=0, vmax=max_plot_value)

    plt.imshow(sign_matrix, cmap='RdYlGn', norm=norm, extent=[0, 1, 1, 0])
    plt.xticks(np.linspace(0,1,11))
    plt.yticks(np.linspace(0,1,21))

    if annotate_divisors == True:
        rows, cols = sign_matrix.shape
        for m in range(rows):
            for n in range(cols):
                val = div_matrix[m, n]
                for k in range(size_of_matrix + 2):
                    if str(k) == str(val):
                        x = (n + 0.5) / (cols)
                        y = (m + 0.5) / (rows)
                        plt.text(x, y, f"{int(val)}", color=ray_color_list[k], ha="center", va="center", fontsize=divisor_size(dimensions))

    # Create title string
    title_parts = []
    for dim in sorted(slider_values.keys(), key=lambda x: int(x.split('_')[1])):
        alpha_val = slider_values[dim]
        dim_index = int(dim.split('_')[1])
        if dim_index == 0:
            H_part = f"{round(alpha_val, 4)}·H − "
            title_parts.append(H_part)
        else:
            formatted = format_e_with_subscript(dim_index)
            title_parts.append(f"{round(alpha_val, 4)}·" + formatted + " − ")
    title_str = f'α = {" ".join(title_parts)}'
    plt.title(title_str)
    plt.xlabel(f"α_{chr(97 + len(slider_values) + 1)}")  # Last dimension
    plt.ylabel(f"α_{chr(97 + len(slider_values))}")      # Second last dimension

    fig_color = plt.colorbar(ticks=np.linspace(min_plot_value, max_plot_value, 10))
    plt.show()


def plot_func_nd(size_of_matrix, num_dimensions):
    '''
    This creates the sliders of the remaining dimensions of the plot
    '''
    step_counter = 1 / (size_of_matrix - 1)
    sliders = {}

    # Create sliders for all but the last two dimensions
    for dim in range(num_dimensions - 2):
        slider_name = f"alpha_{dim}"  # a, b, c, etc.
        sliders[slider_name] = FloatSlider(
            value=0.5,
            min=0,
            max=1,
            step=step_counter,
            description=f"α_{chr(97 + dim)}"
        )

    interact(plot_heatmap_nd, **sliders)


def computed_examples_name(int_input):
    '''
    This function lets you choose which case you wish to plot
    '''
    if int_input == 0:
        return 'CSCKBlP20PointsInfo', '\\text{CSCK}\\; \\text{blowup of}\\; \\mathbb{P}^2\\; \\text{in}\\; 0\\; \\text{points},\\;\\text{file index:}\\;'
    elif int_input == 1:
        return 'CSCKBlP21PointsInfo', '\\text{CSCK}\\; \\text{blowup of}\\; \\mathbb{P}^2\\; \\text{in}\\; 1\\; \\text{points},\\;\\text{file index:}\\;'
    elif int_input == 2:
        return 'CSCKBlP22PointsInfo', '\\text{CSCK}\\; \\text{blowup of}\\; \\mathbb{P}^2\\; \\text{in}\\; 2\\; \\text{points},\\;\\text{file index:}\\;'
    elif int_input == 3:
        return 'CSCKBlP23PointsInfo', '\\text{CSCK}\\; \\text{blowup of}\\; \\mathbb{P}^2\\; \\text{in}\\; 3\\; \\text{points},\\;\\text{file index:}\\;'
    elif int_input == 4:
        return 'CSCKBlP24PointsInfo', '\\text{CSCK}\\; \\text{blowup of}\\; \\mathbb{P}^2\\; \\text{in}\\; 4\\; \\text{points},\\;\\text{file index:}\\;'
    elif int_input == 5:
        return 'CSCKBlP25PointsInfo', '\\text{CSCK}\\; \\text{blowup of}\\; \\mathbb{P}^2\\; \\text{in}\\; 5\\; \\text{points},\\;\\text{file index:}\\;'
    elif int_input == 6:
        return 'CSCKBlP26PointsInfo', '\\text{CSCK}\\; \\text{blowup of}\\; \\mathbb{P}^2\\; \\text{in}\\; 6\\; \\text{points},\\;\\text{file index:}\\;'
    elif int_input == 7:
        return 'CSCKBlP1xP10PointsInfo', '\\text{CSCK}\\; \\text{blowup of}\\; \\mathbb{P}^1\\times\\mathbb{P}^1\\;\\text{in}\\; 0\\;\\text{points},\\;\\text{file index:}\\;'
    elif int_input == 8:
        return 'CSCKBlP1xP11PointsInfo', '\\text{CSCK}\\; \\text{blowup of}\\; \\mathbb{P}^1\\times\\mathbb{P}^1\\;\\text{in}\\; 1\\;\\text{points},\\;\\text{file index:}\\;'
    elif int_input == 9:
        return 'CSCKBlP1xP12PointsInfo', '\\text{CSCK}\\; \\text{blowup of}\\; \\mathbb{P}^1\\times\\mathbb{P}^1\\;\\text{in}\\; 2\\;\\text{points},\\;\\text{file index:}\\;'
    elif int_input == 10:
        return 'CSCKBlP1xP13PointsInfo', '\\text{CSCK}\\; \\text{blowup of}\\; \\mathbb{P}^1\\times\\mathbb{P}^1\\;\\text{in}\\; 3\\;\\text{points},\\;\\text{file index:}\\;'
    elif int_input == 11:
        return 'CSCKBlP1xP14PointsInfo', '\\text{CSCK}\\; \\text{blowup of}\\; \\mathbb{P}^1\\times\\mathbb{P}^1\\;\\text{in}\\; 4\\;\\text{points},\\;\\text{file index:}\\;'
    elif int_input == 12:
        return 'CSCKBlP1xP15PointsInfo', '\\text{CSCK}\\; \\text{blowup of}\\; \\mathbb{P}^1\\times\\mathbb{P}^1\\;\\text{in}\\; 5\\;\\text{points},\\;\\text{file index:}\\;'
    elif int_input == 13:
        return 'CSCKBlHirzebruch20PointsInfo', '\\text{CSCK}\\;\\text{blowup of}\\;\\text{Hirzebruch with}\\; r=2\\;\\text{in}\\;0\\;\\text{points},\\;\\text{file index:}\\;'
    elif int_input == 14:
        return 'CSCKBlHirzebruch21PointsInfo', '\\text{CSCK}\\;\\text{blowup of}\\;\\text{Hirzebruch with}\\; r=2\\;\\text{in}\\;1\\;\\text{points},\\;\\text{file index:}\\;'
    elif int_input == 15:
        return 'CSCKBlHirzebruch22PointsInfo', '\\text{CSCK}\\;\\text{blowup of}\\;\\text{Hirzebruch with}\\; r=2\\;\\text{in}\\;2\\;\\text{points},\\;\\text{file index:}\\;'
    elif int_input == 16:
        return 'CSCKBlHirzebruch23PointsInfo', '\\text{CSCK}\\;\\text{blowup of}\\;\\text{Hirzebruch with}\\; r=2\\;\\text{in}\\;3\\;\\text{points},\\;\\text{file index:}\\;'
    elif int_input == 17:
        return 'CSCKBlHirzebruch24PointsInfo', '\\text{CSCK}\\;\\text{blowup of}\\;\\text{Hirzebruch with}\\; r=2\\;\\text{in}\\;4\\;\\text{points},\\;\\text{file index:}\\;'
    elif int_input == 18:
        return 'CSCKBlHirzebruch25PointsInfo', '\\text{CSCK}\\;\\text{blowup of}\\;\\text{Hirzebruch with}\\; r=2\\;\\text{in}\\;5\\;\\text{points},\\;\\text{file index:}\\;'
    elif int_input == 19:
        return 'JeqBlP22PointsInfo', '\\text{J-eq}\\;\\text{blowup of}\\; \\mathbb{P}^2\\; \\text{in}\\ 2\\;\\text{points},\\;\\text{file index:}\\;'
    elif int_input == 20:
        return 'JeqBlP23PointsInfo', '\\text{J-eq}\\;\\text{blowup of}\\; \\mathbb{P}^2\\; \\text{in}\\ 3\\;\\text{points},\\;\\text{file index:}\\;'
    elif int_input == 21:
        return 'JeqBlP1xP11PointsInfo', '\\text{J-eq}\\;\\text{blowup of}\\; \\mathbb{P}^1\\times\\mathbb{P}^1\\; \\text{in}\\ 1\\;\\text{points},\\;\\text{file index:}\\;'
    elif int_input == 22:
        return 'JeqBlP23PointsInfo4Bea0333b05c075d0333', ''
    elif int_input == 23:
        return 'JeqBlP21PointsInfo', '\\text{J-eq}\\;\\text{blowup of}\\; \\mathbb{P}^2\\; \\text{in}\\ 1\\;\\text{points},\\;\\text{file index:}\\;'
    elif int_input == 24:
        return 'JeqBlP21PointsInfo', '\\text{J-eq}\\;\\text{blowup of}\\; \\mathbb{P}^2\\; \\text{in}\\ 1\\;\\text{points},\\;\\text{file index:}\\;'


def computed_examples_indices(ind):
    '''
    This function contains the cases computed
    '''
    indices = {
        0: 'None',
        1: '0 - 2',
        2: '0 - 8',
        3: '0 - 18',
        4: '0 - 20',
        5: '0 - 20',
        6: '0 - 4',
        7: '0',
        8: '0 - 3',
        9: '0 - 13',
        10: '0 - 19',
        11: '0 - 20',
        12: '0 - 3',
        13: '0',
        14: '0 - 1',
        15: '0 - 4',
        16: '0 - 5',
        17: '0 - 7',
        18: '0 - 1',
        19: '0, 2, 5, 7-8',
        20: '0, 1, 4',
        21: '3',
        22: '4',
        23: '2',
        24: '2'
    }

    return indices.get(ind)


general_file = int(simpledialog.askstring(
    "Which fan 'Type' do you wish to see?",
    f"0: P2 in 0 points,             indices computed ({computed_examples_indices(0)})"
    f"\n1: P2 in 1 points,             indices computed ({computed_examples_indices(1)})"
    f"\n2: P2 in 2 points,             indices computed ({computed_examples_indices(2)})"
    f"\n3: P2 in 3 points,             indices computed ({computed_examples_indices(3)})"
    f"\n4: P2 in 4 points,             indices computed ({computed_examples_indices(4)})"
    f"\n5: P2 in 5 points,             indices computed ({computed_examples_indices(5)})"
    f"\n6: P2 in 6 points,             indices computed ({computed_examples_indices(6)})"
    f"\n7: P1xP1 in 0 points,          indices computed ({computed_examples_indices(7)})"
    f"\n8: P1xP1 in 1 points,          indices computed ({computed_examples_indices(8)})"
    f"\n9: P1xP1 in 2 points,          indices computed ({computed_examples_indices(9)})"
    f"\n10: P1xP1 in 3 points,          indices computed ({computed_examples_indices(10)})"
    f"\n11: P1xP1 in 4 points,         indices computed ({computed_examples_indices(11)})"
    f"\n12: P1xP1 in 5 points,         indices computed ({computed_examples_indices(12)})"
    f"\n13: Hirzebruch 2 in 0 points,  indices computed ({computed_examples_indices(13)})"
    f"\n14: Hirzebruch 2 in 1 points,  indices computed ({computed_examples_indices(14)})"
    f"\n15: Hirzebruch 2 in 2 points,  indices computed ({computed_examples_indices(15)})"
    f"\n16: Hirzebruch 2 in 3 points,  indices computed ({computed_examples_indices(16)})"
    f"\n17: Hirzebruch 2 in 4 points,  indices computed ({computed_examples_indices(17)})"
    f"\n18: Hirzebruch 2 in 5 points,  indices computed ({computed_examples_indices(18)})"
    f"\n19: J-eq P2 in 2 points        indices computed ({computed_examples_indices(19)})"
    f"\n20: J-eq P2 in 3 points        indices computed ({computed_examples_indices(20)})"
    f"\n21: J-eq P1xP1 in 1 points     indices computed ({computed_examples_indices(21)})"
    f"\n22: J-eq P2 in 3 points not antican indices computed ({computed_examples_indices(22)})"
    f"\n23: J-eq P2 in 1 points        indices computed ({computed_examples_indices(23)})"
    f"\n24: J-eq P2 in 1 points        indices computed ({computed_examples_indices(24)})"
))



general_file_name, latex_info = computed_examples_name(general_file)

index_of_file = str(simpledialog.askstring(
    "Which fan do you wish to see?",
    "Enter the index according to the LaTeX document"
    f"\nIndices computed {computed_examples_indices(general_file)}"
))

beta_coeffs_a = str(simpledialog.askstring(
    "What coefficients of beta you wish to see?",
    "Enter the fraction values of a for beta"
))


beta_coeffs_b = str(simpledialog.askstring(
    "What coefficients of beta you wish to see?",
    "Enter the fraction values of b for beta"
))

display(Math(fr'{latex_info}{index_of_file}'))
if general_file_name[0] == 'J' and general_file_name[-1:] == 'o':
    try:
        sign_data = np.load(f'JeqResults/{general_file_name}{index_of_file}Be{beta_coeffs_a}a{beta_coeffs_b}b.npy.SignData.npy', allow_pickle=True)
        div_data = np.load(f'JeqResults/{general_file_name}{index_of_file}Be{beta_coeffs_a}a{beta_coeffs_b}b.npy.DivData.npy', allow_pickle=True)
        info = np.load(f'Info/Jeq{general_file_name[3:]}{index_of_file}Be{beta_coeffs_a}a{beta_coeffs_b}b.npy', allow_pickle=True)
    except:
        sign_data = np.load(f'JeqResults/{general_file_name}{index_of_file}BetaAntiCan.npy.SignData.npy', allow_pickle=True)
        div_data = np.load(f'JeqResults/{general_file_name}{index_of_file}BetaAntiCan.npy.DivData.npy', allow_pickle=True)
        info = np.load(f'Info/CSCK{general_file_name[3:]}{index_of_file}.npy', allow_pickle=True)

elif general_file_name[0] == 'J' and general_file_name[-1:] == '3':
    sign_data = np.load(f'JeqResults/{general_file_name}.npy.SignData.npy', allow_pickle=True)
    div_data = np.load(f'JeqResults/{general_file_name}.npy.DivData.npy', allow_pickle=True)
    info = np.load(f'Info/JeqBlP23PointsInfo4Bea0333b05c075d0333.npy', allow_pickle=True)
else:
    sign_data = np.load(f'ResultsOfInterest/{general_file_name}{index_of_file}.npy.SignData.npy', allow_pickle=True)
    div_data = np.load(f'ResultsOfInterest/{general_file_name}{index_of_file}.npy.DivData.npy', allow_pickle=True)
    info = np.load(f'Info/{general_file_name}{index_of_file}.npy', allow_pickle=True)
antican_info = info[1]

ray_color_list = []
size_of_matrix = len(sign_data)
dimensions = len(sign_data.shape)

for i in range(dimensions + 2):
    color = 'black'
    ray_color_list.append(color)

index_positions = np.linspace(0, 1, size_of_matrix)

def display_antican_info(coeff_info):
    '''
    This function displays the fixed divisors coefficients

    coeff_info: information on the fixed divisor
    '''
    antican_indexes = r'\beta = '
    for i in range(dimensions):
        indexes = coeff_info[i]
        if i == 0:
            H_part = f"{round(indexes, 4)}·H − "
            antican_indexes += H_part
        else:
            formatted_str = f"{round(indexes, 4)}·E_{i}" + " − "
            antican_indexes += formatted_str
    antican_indexes = antican_indexes[:-3]

    display(Math(r'\text{Antican info}\colon'))
    display(Math(antican_indexes))


def display_value(type_of_value, val):
    '''
    This function extracts the information of the coefficients of a divisor and its associated value
        and displays it in LaTeX style
    '''
    position = np.where(sign_data == val)
    position_list = list(zip(*position))
    value_indexes = r'\alpha = '
    for i in range(dimensions):
        indexes = int(position_list[0][i])
        indexes_pos = index_positions[indexes]
        if i == 0:
            H_part = f"{round(indexes_pos, 4)}·H − "
            value_indexes += H_part
        else:
            formatted_str = f"{round(indexes_pos, 4)}·E_{i}" + " − "
            value_indexes += formatted_str
    value_indexes = value_indexes[:-3]

    display(Math(fr'\text{{{type_of_value}}}=' + f'{round(val, 10)} : '))
    display(Math(value_indexes))


def find_maximum_value(sign_matrix_data, value_check):
    '''
    This function searches for the maximum value of the chosen plot

    sign_matrix_data: is the data of the values chosen to be plotted
    value_check: is the value we are checking against

    Returns: 'max_value' the maximum value found in the sign data
    '''
    flattened_matrix = sign_matrix_data.flatten()
    unique_values = np.unique(flattened_matrix)
    sorted_unique_values = np.sort(unique_values)[::-1]
    bool_temp = True
    ind = 0
    while bool_temp:
        if sorted_unique_values[ind] < value_check or (sorted_unique_values[ind] > 0 and sorted_unique_values[ind] != 50000 and sorted_unique_values[ind] != 1000):
            max_value = sorted_unique_values[ind]
            bool_temp = False
        ind += 1

    return max_value


def find_minimum_value(sign_matrix_data, value_check):
    '''
    This function searches for the minimum value of the chosen plot

    sign_matrix_data: is the data of the values chosen to be plotted
    value_check: is the value we are checking agianst

    Returns: 'min_value' the minimum value found in the sign data
    '''
    flattened_matrix = sign_matrix_data.flatten()
    unique_values = np.unique(flattened_matrix)
    sorted_unique_values = np.sort(unique_values)
    bool_temp = True
    ind = 0
    while bool_temp:
        if sorted_unique_values[ind] > value_check:
            min_value = sorted_unique_values[ind]
            bool_temp = False
        ind += 1

    return min_value


def find_closest_antican_value(sign_matrix_data):
    '''
    This function searches for the α that for which I(α) is roughly -1
        we expect for the quantity I, that when α=-K I(-K)=-1

    sign_matrix_data: the values data

    Returns: the α for which I(α) is the closest to -1
    '''
    flattened_matrix = sign_matrix_data.flatten()
    unique_values = np.unique(flattened_matrix)
    sorted_unique_values = np.sort(unique_values)[::-1]
    dist = 1_000
    ind = -1
    for i in range(len(sorted_unique_values)):
        tmp_dist = abs(-1 - sorted_unique_values[i])
        if tmp_dist < dist:
            dist = tmp_dist
            ind = i

    return sorted_unique_values[ind]


def find_unique_divisors(divisor_data, show_count):
    '''
    This function searches through the divisor data to find the number of times each
        torus invariant divisor realised the computed quantity

    divisor_data: is the data of the divisors
    show_count: boolean on whether or not the count of the divisors shall be shown
    '''
    flattened_div_matrix = [val for val in divisor_data.flatten() if val is not None]
    unique_divisors, counts = np.unique(flattened_div_matrix, return_counts=True)
    unique_divisors = unique_divisors[1:]
    counts = counts[1:]
    sorted_indices = np.argsort(unique_divisors)
    sorted_unique_divisors = unique_divisors[sorted_indices]
    sorted_counts = counts[sorted_indices]
    if show_count:
        for div, count in zip(sorted_unique_divisors, sorted_counts):
            count = "{:,}".format(count).replace(',','.')
            display(Math(fr'\text{{Divisor}}: {div}, \text{{Count}}: {count}'))

    return sorted_unique_divisors, sorted_counts

def display_min_value(check_value):
    '''
    This function displays the minimum value in LaTeX style
    '''
    min_value = find_minimum_value(sign_data, check_value)
    display_value("Minimum value", min_value)


def display_max_value(check_value):
    '''
    This function displays the maximum value in LaTeX style
    '''
    max_value_sign_data = find_maximum_value(sign_data, check_value)
    display_value("Maximum value", max_value_sign_data)


def display_antican_value():
    '''
    This function displays the value of the closest α for which I(α) is roughly -1
    '''
    antican_value = find_closest_antican_value(sign_data)
    display_value("Antican value", antican_value)


def check_positive_areas(sign_matrix_data):
    '''
    This function checks the sign data for positive areas
    '''
    flattened_matrix = sign_matrix_data.flatten()
    unique_values = np.unique(flattened_matrix)
    sorted_unique_values = np.sort(unique_values)[::-1]
    dist = 1_000
    ind = -1
    for i in range(len(sorted_unique_values)):
        tmp_dist = abs(sorted_unique_values[i])
        if tmp_dist < dist:
            dist = tmp_dist
            ind = i
    if ind < 5:
        min_ind = 0
    else:
        min_ind = ind - 5
    tmp = list(sorted_unique_values[min_ind: ind])
    for val in list(sorted_unique_values[ind : ind + 5]):
        tmp.append(val)
    temp = []
    for i in range(len(tmp)):
        temp.append(float(tmp[i]))
    for j in range(len(temp)):
        if temp[j] == sorted_unique_values[ind]:
            display_value("Center", temp[j])
        else:
            display_value("TEST", temp[j])


min_plot_value = -3
max_plot_value = 3

check_for_max_value = 0
check_for_min_value = -100_000_000_000_000_000

annotate_divisors = False

#check_positive_areas(sign_data)

display_antican_info(antican_info)
#display_antican_value()
#display_min_value(check_for_min_value)
#display_max_value(check_for_max_value)
#unique_divs, div_counts = find_unique_divisors(div_data, True)
plot_func_nd(size_of_matrix, dimensions)